'use strict';

var exec = require('child_process').exec;

var fs = require("fs");
var path = require("path");

var projectPath = fis.project.getProjectPath();
var moduleDir = projectPath + '/modules/';

var installed = [];

var gargv;

function travel(dir, callback) {
    fs.readdirSync(dir).forEach(function(file) {
        var pathname = path.join(dir, file);

        if (fs.statSync(pathname).isDirectory()) {
            travel(pathname, callback);

            var basename = path.basename(pathname);
            var parentBasename = getParentBaseName(pathname);

            // 安装后的模块
            var moduleName = parentBasename+"/"+basename;


            if (parentBasename.indexOf("@pc") >= 0) {

                var rSource = path.resolve(projectPath, pathname);
                // var rSourceSrc = path.resolve(projectPath, pathname, "src");
                var rSourcePackage = path.resolve(projectPath, pathname, "package.json");



                // if (!fis.util.exists(rSourceSrc)) {
                //     fis.log.warn("[%s]不符合模块规范，须有src源码目录", moduleName);
                //     return;
                // }


                // if (!fis.util.exists(rSourcePackage)) {
                //     fis.log.warn("[%s]模块缺少package.json文件", moduleName);
                //     return;
                // }



                var target = path.resolve(moduleDir, basename);
                // var targetSrc = path.resolve(moduleDir, basename, "src");
                var targetPackage = path.resolve(moduleDir, basename, "package.json");

                // 准备安装的版本
                var sourceVersion = fis.util.readJSON(rSourcePackage).version;

                //满足以下条件才会安装到modules目录
                // modules不存在该模块 或者 指定模块安装并且是强制模式


                if (!fis.util.exists(targetPackage) || (gargv._.slice(1).length && gargv.force)) {

                    fis.util.mkdir(target);

                    fis.util.copy(rSource, target,["**"],[rSource+"/{node_modules,test}/**",rSource+"\.**"]);
                    // fis.util.copy(rSourceSrc, targetSrc);
                    // fis.util.copy(rSourcePackage, targetPackage);

                    installed.push("pcnpm:" +moduleName+ "@" + sourceVersion);


                } else {
                    // 已安装版本
                    var targetVersion = fis.util.readJSON(targetPackage).version;
                    // console.log(sourceVersion)
                    // console.log(targetVersion)
                    
                    installed.push("pcnpm:" +moduleName+ "@" + targetVersion);

                    var ret = compareVersion(sourceVersion, targetVersion);

                    // < || 》
                    if (ret != 2) {
                        fis.log.warn("子系统当前使用的 [%s] 版本为 [%s]，如需安装 [%s] 版本，可通过 pcat install %s --force 强制安装，注意，修改会影响整个子系统，慎重操作！！！", moduleName, targetVersion, sourceVersion, moduleName+ "@" + sourceVersion)
                    } 
                }
            }

        }
    });
}

//获取上一级的目录名
function getParentBaseName(pathname) {
    var dir = path.dirname(pathname);

    var basename = path.basename(path.dirname(pathname));

    return basename;

}


/**
 * 对比两个版本大小
 * @param  {String} v1 版本1
 * @param  {String} v2 版本2
 * @return {Number}    1：小于，2：等于，3：大于
 */
function compareVersion(v1, v2) {
    var v1Arr = v1.split("."),

        v2Arr = v2.split(".");

    var ret = 2;

    for (var i = 0; i < 3; i++) {
        if (v1Arr[i] > v2Arr[i]) {
            ret = 3;
            break;
        } else if (v1Arr[i] < v2Arr[i]) {
            ret = 1;
            break;
        }
    }

    return ret;

}


exports.name = 'install';
exports.desc = 'install module from pcnpm';
exports.options = {
    '-h, --help': 'print this help message',
    '--module': 'module from pcnpm'
};

exports.run = function(argv, cli) {
    gargv = argv;
    // 输出帮助信息。
    if (argv.h || argv.help) {
        return cli.help(exports.name, exports.options);
    }


    var mod = argv._.slice(1);

    if (!mod.length) mod.push(" ");

    mod.forEach(function(v, i) {
        var pcnpm = exec('npm install ' + v + ' --registry=http://registry.npm.pc.com.cn/')

        pcnpm.stdout.on('data', function(data) {

        });

        pcnpm.stderr.on('data', function(data) {
            console.log("error:".red.bold + data)

        });

        pcnpm.on('close', function(code) {
            // 遍历node_modules 目录，将模块扁平化
            travel('./node_modules');

            // 打印安装的模块列表
            if (installed.length) {
                console.log("Installed list:")
                installed.forEach(function(item) {
                    console.log("├─" + item)
                })
            }

            // 删除 node_modules 目录
            fis.util.del(projectPath+"/node_modules");

        });


    })

};
