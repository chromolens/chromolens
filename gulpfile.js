var gulp = require('gulp'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn;

/**
 * The default task
 */
gulp.task('default', function(){
    console.log("All tasks:");
    for( var i in gulp.tasks ){
        if( gulp.tasks.hasOwnProperty(i) ){
            console.log('- ', i);
        }
    }
});

/**
 * Updates all node and bower dependencies
 */
gulp.task('update', function(){
    console.log('Running: npm install --update');
    exec('npm install --update');

    console.log('Running: bower install  --update');
    exec('bower install  --update');
});

/**
 * Compile all TypeScript files
 */
gulp.task('compile', function(){
    var cmd = './node_modules/typescript/bin/tsc src/*.ts --outDir js';
    console.log(cmd);

    exec(cmd, function(err, stdout, stderr){
        console.log(err || stdout || stderr);
    });
});

/**
 * Creates a simple server at the 8000 port
 */
gulp.task('serve', function(){
    exec('python -m SimpleHTTPServer', function(err, stdout, stderr){
        console.log(err || stdout || stderr);
    });
    console.log('open http://localhost:8000');
});
