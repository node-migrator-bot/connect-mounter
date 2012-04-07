(function () {
  "use strict";

  var connect = require('connect')
    , fs = require('fs')
    , path = require('path')
    , failers = []
    ;

  function create(dirname) {
    var dirs = fs.readdirSync(dirname)
      , apps = []
      , servers = []
      , server
      , connectApp
      ;

    function eachApp(appname) {
      var serverPath = path.join(dirname, appname)
        , server = path.join(serverPath, 'server.js')
        , app = path.join(serverPath, 'app.js')
        , appnames
        , stats
        ;

      try {
        if (!fs.statSync(serverPath).isDirectory()) {
          throw new Error('IGNORED not a directory');
        }
      } catch(e) {
        server += '.js';
        return;
      }

      try {
        stats = fs.statSync(server);
      } catch(e) {
        server = undefined;
        try {
          stats = fs.statSync(app);
        } catch(e) {
          app = undefined;
        }
      }

      server = server || app;

      if (!server) {
        console.warn('[WARN] "' + serverPath + "\" doesn't have 'server.js' or 'app.js'. Ignoring.");
        return;
      }

      try {
        server = require(server);
      } catch(e) {
        console.error('ERROR: [', appname, '] failed to load.');
        console.error(e);
        failers.push(appname);
        return;
      }

      connectApp.use('/' + appname, server);
      console.info('Loaded /' + appname);
    }

    connectApp = connect();
    dirs.forEach(eachApp);

    return connectApp;
  }

  module.exports.create = create;
  module.exports.fail = failers;

  function run() {
    var app = create(path.join(process.cwd(), 'mounts'))
      , port = process.argv[2]
      , server
      ;

    function listening() {
      console.info('Listening on ' + server.address().address + ':' + server.address().port);
    }

    if (port) {
      server = app.listen(port, listening);
    } else {
      server = app.listen(listening);
    }
  }

  if (require.main === module) {
    console.info("\n=== connect-mounter running in stand-alone mode ===\n");
    run();
  }
}());
