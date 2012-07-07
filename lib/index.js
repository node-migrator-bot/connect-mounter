/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var connect = require('connect')
    , fs = require('fs')
    , path = require('path')
    , failers = []
    ;

  function sortByAliasLength(a, b) {
    return b.alias.length - a.alias.length;
  }

  function loadAppAndMountsAndSubdomains(appname) {
    /*jshint validthis:true*/
    var self = this
      , serverPath = path.join(self.dirname, appname)
      , aliasesPath = path.join(self.dirname, 'aliases')
      , aliases
      , subdomains
      , server
      ;

    ['', 'server.js', 'server', 'server/server', 'app.js', 'app'].some(function (part) {
      try {
        server = require(path.join(serverPath, part));
        return true;
      } catch(e) {
        //console.error(e);
        server = undefined;
      }
    });

    try {
      aliases = require(aliasesPath);
    } catch(e) {
      aliases = [];
    }
    aliases.push(appname);

    if (!server) {
      console.error('ERROR: [', appname, '] could not be required.');
      failers.push(appname);
      return;
    }

    //console.log('create mounts', serverPath, self.parent);
    createMounts(serverPath, server, self.parent + '/' + appname);
    subdomains = createSubdomains(serverPath, appname + '.' + self.parent);

    aliases.forEach(function (alias) {
      self.servers.push({parent: self.parent, alias: alias, server: server});
      subdomains.forEach(function (subdomain) {
        self.servers.push({parent: self.parent, alias: subdomain.alias + '.' + alias, server: subdomain.server});
      });
    });
  }

  function create(dirname, connectApp, type, parent) {
    var dirs
      , apps = {}
      ;

    parent = parent || '';
    if ('subdomains' === type && parent) {
      parent = '.' + parent;
    } else if ('mounts' === type && !parent) {
      parent = '';
    }
    apps.parent = parent;

    if (!type) {
      type = 'vhost';
    }

    try {
      dirs = fs.readdirSync(dirname);
    } catch(e) {
      // ignore
    }

    apps.dirname = dirname;
    apps.servers = [];

    dirs.forEach(loadAppAndMountsAndSubdomains, apps);

    if ('subdomains' === type) {
      return apps.servers;
    }

    if (!dirs.length) {
      return false;
    }

    apps.servers.sort(sortByAliasLength);
    apps.servers.forEach(function (app) {
      if ('vhosts' === type) {
        console.info('Vhosted ' + app.alias + app.parent);
        connectApp.use(connect.vhost(app.alias + app.parent, app.server));
      } else if ('mounts' === type) {
        console.info('Mounted ' + app.parent + ' -- /' + app.alias);
        //connectApp.use(app.parent + '/' + app.alias, app.server); // depth-first
        connectApp.use('/' + app.alias, app.server);
      } else {
        throw new Error('unhandled type ' + type);
      }
      /*
      if ('subdomains' === type) {
        // TODO
        connectApp.use(connect.vhost(app.alias + parentDomain, app.server));
        console.info('Loaded ' + app.alias + parentDomain);
      }
      */
    });

    if (apps.servers.length) {
      return true;
    }
  }

  function createMounts(pathname, app, parent) {
    var type = 'mounts'
      , typePath = path.join(pathname, type)
      , serverTypePath = path.join(pathname, 'server', type)
      , newPathname
      , newApp = connect.createServer()
      ;

    newPathname = fs.existsSync(typePath) && typePath;
    newPathname = fs.existsSync(serverTypePath) && serverTypePath || newPathname;

    if (newPathname && create(newPathname, newApp, type, parent)) {
      app.use(newApp);
    //if (newPathname && create(newPathname, app, type, parent)) { // depth-first
      return true;
    }
  }

  function createVhosts(pathname, app) {
    var type = 'vhosts'
      , typePath = path.join(pathname, type)
      , serverTypePath = path.join(pathname, 'server', type)
      ;

    if (fs.existsSync(typePath)) {
      return create(typePath, app, type);
    }

    if (fs.existsSync(serverTypePath)) {
      return create(serverTypePath, app, type);
    }
  }

  function createSubdomains(pathname, parent) {
    var type = 'subdomain'
      , typePath = path.join(pathname, type)
      , serverTypePath = path.join(pathname, 'server', type)
      ;

    if (fs.existsSync(typePath)) {
      return create(typePath, null, type, parent);
    }

    if (fs.existsSync(serverTypePath)) {
      return create(serverTypePath, null, type, parent);
    }

    return [];
  }

  function createHelper(pathname) {
    var app = connect.createServer()
      , vhosted
      , mounted
      ;

    vhosted = createVhosts(pathname, app);

    if (vhosted) {
      // TODO nowww
    }

    mounted = createMounts(pathname, app);

    if (vhosted || mounted) {
      // TODO githook, etc
      app.use(function (req, res) {
        res.end('Can not ' + req.method + ' ' + req.url + '\n');
      });
      return app;
    }
  }

  module.exports.create = createHelper;
  module.exports.fail = failers;

  function run() {
    var port = process.argv[2]
      , server
      ;

    function listening() {
      console.info('Listening on ' + server.address().address + ':' + server.address().port);
    }

    server = createHelper(process.cwd()).listen(port || 0, listening);
  }

  if (require.main === module) {
    console.info("\n=== connect-mounter running in stand-alone mode ===\n");
    run();
  }
}());
