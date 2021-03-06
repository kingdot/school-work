const CleanCss = require("clean-css");
const fs = require("fs");
const FileUtil = require("./FileUtil");
const PrintUtil = require("./PrintUtil");
const {getAllWordsInContent, obj2Array} = require("./ExtractWordsUtil");
const SelectorFilter = require("./SelectorFilter");
const CssTreeWalker = require("./CssTreeWalker");
const path = require('path');
const {spawn} = require('child_process');
let pyprog = null; // 保存子进程句柄

// 退出
process.on("exit", function (code) {
    //进行一些清理工作
    console.log("处理完毕，正在退出...");
    pyprog.kill();
});
// 默认OPTIONS
const OPTIONS = {
    output: false,
    minify: false,
    info: false,
    rejected: false,
    whitelist: [],
    cleanCssOptions: {}
};

const getOptions = (options = {}) => {
    let opt = {};
    for (let option in OPTIONS) {
        opt[option] = options[option] || OPTIONS[option]
    }
    return opt;
};
// 压缩
const minify = (cssSource, options) =>
    new CleanCss(options).minify(cssSource).styles;

// 入口函数
const purify = (url, otherCss, otherJs, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    options = getOptions(options);

    //cssString为css源码
    let cssString = FileUtil.filesToSource(otherCss, "css");

    // 启动
    pyprog = spawn('python', [path.join(__dirname, 'dynamic.py'), url, otherJs]);

    // 1秒钟从指定目录中查看一次
    let isFinish = false;
    let timer = null;
    (function timerWrapper() {
        if (timer && isFinish) {
            clearInterval(timer);
            return;
        }

        timer = setTimeout(function () {
            let pyUseResultPath = path.join(__dirname, 'py_use_result.txt');
            let pyAllResultPath = path.join(__dirname, 'py_all_result.txt');

            if (fs.existsSync(pyUseResultPath) && fs.existsSync(pyAllResultPath)) {
                isFinish = true;
                let dataStr = fs.readFileSync(pyUseResultPath, "utf-8");

                //cssString为css源码
                cssString += fs.readFileSync(pyAllResultPath, "utf-8");
                PrintUtil.startLog(minify(cssString).length); // 统计的是压缩后的长度

                calculate(dataStr, cssString, options, callback);
                fs.unlinkSync(pyUseResultPath);
                fs.unlinkSync(pyAllResultPath);
            } else {
                timerWrapper();
            }
        }, 1000);
    })();

};

// 开始计算
function calculate(dataStr, cssString, options, callback) {

    let dataObj = JSON.parse(dataStr);

    // content为class使用者
    let content = obj2Array(dataObj);
    let wordsInContent = getAllWordsInContent(content), // 一个对象
        // options.whitelist是一个关键字数组
        // 添加白名单的一些key到map里面，同时所有信息都挂在返回的对象上面
        selectorFilter = new SelectorFilter(wordsInContent, options.whitelist),
        tree = new CssTreeWalker(cssString, [selectorFilter]);

    tree.beginReading();
    let source = tree.toString();

    source = options.minify ? minify(source, options.cleanCssOptions) : source;

    // Option info = true, 打印压缩前与压缩后的体积变化
    if (options.info) {
        if (options.minify) {
            PrintUtil.printInfo(source.length)
        } else {
            PrintUtil.printInfo(minify(source, options.cleanCssOptions).length)
        }
    }

    // Option rejected = true
    if (options.rejected && selectorFilter.rejectedSelectors.length) {
        PrintUtil.printRejected(selectorFilter.rejectedSelectors)
    }

    if (options.output) {
        fs.writeFile(options.output, source, err => {
            if (err) return err
        })
    } else {
        return callback ? callback(source) : source
    }
}

module.exports = {purify};

// 测试结果
// purify("https://www.sogou.com/", '', '', {
//     info: true
// }, data => {
//     console.log(data)
// });
