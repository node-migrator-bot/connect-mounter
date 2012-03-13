You give `connect-mounter` a path to a directory with other directores that contain `server.js` or `app.js` and export a connect app, it mounts them according to the name of the directory.

Example
===

    git clone git://github.com/SpotterRF/connect-mounter.git
    cd connect/mounter/examples/
    ls mounts/
    # eggman/ walrus/
    node server 4080 &
    curl http://localhost:4080/eggman
    curl http://localhost:4080/walrus

Usage
===

    npm install mounter

my-mounter.js:

    (function () {
      "use strict";

      var mounter = require('connect-mounter')
        , port = process.argv[2]
        , server
        ;

      mounter.create('/path/to/mounts');

      function listening() {
        console.info('Listening on ' + server.address().address + ':' + server.address().port);
      }

      if (port) {
        server = mounter.listen(port, listening);
      } else {
        server = mounter.listen(listening);
      }
    }());
