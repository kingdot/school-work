const CleanCss = require("clean-css");

const FileUtil = require("./FileUtil");
const PrintUtil = require("./PrintUtil");
const {getAllWordsInContent, obj2Array} = require("./ExtractWordsUtil");
const SelectorFilter = require("./SelectorFilter");
const CssTreeWalker = require("./CssTreeWalker");

const path = require('path');
const {spawn} = require('child_process');
const pyprog = spawn('python', [path.join(__dirname, 'dynamic.py'), 'https://www.sogou.com/']);
const redis = require('redis'), client = redis.createClient('6379', '127.0.0.1');

// 存储总数居
let bag = {}, timer = null;
// 处理来自redis的数据
const processDataFromRedis = function (str) {
    try {
        let temp = JSON.parse(str),
            tokenArr = Object.keys(temp),
            host = temp.host;

        if (!bag[host]) {
            bag[host] = {
                fromJs: {},
                fromHtml: {}
            }
        }

        let one = bag[host]; // 该站点信息
        if (tokenArr.indexOf("IDs") > -1 || tokenArr.indexOf("classes") > -1) {
            // data from js
            let IDsArr = one['fromJs']['IDs'], classesArr = one['fromJs']['classes'];
            Object.keys(one['fromJs']).length
                ? (one['fromJs']['IDs'] = unique((IDsArr || []).concat(temp['IDs'])))
                && (one['fromJs']['classes'] = unique((classesArr || []).concat(temp['classes'])))
                : one['fromJs'] = {IDs: temp['IDs'], classes: temp['classes']}

        } else if (tokenArr.indexOf("classes_from_html") > -1) {
            // classes data form html
            if (Object.keys(one['fromHtml']).length) {
                let classesArr = one['fromHtml']['classes'];
                if (classesArr) {
                    one['fromHtml']['classes'] = unique((classesArr || []).concat(temp['classes_from_html']))
                } else {
                    one['fromHtml']['classes'] = temp['classes_from_html']
                }
            } else {
                one['fromHtml'] = {classes: temp['classes_from_html']}
            }

        } else if (tokenArr.indexOf("IDs_from_html") > -1) {
            // ids data from html
            if (Object.keys(one['fromHtml'])) {
                let IDsArr = one['fromHtml']['IDs'];
                if (IDsArr) {
                    one['fromHtml']['IDs'] = unique((IDsArr || []).concat(temp['IDs_from_html']))
                } else {
                    one['fromHtml']['IDs'] = temp['IDs_from_html']
                }
            } else {
                one['fromHtml'] = {IDs: temp['IDs_from_html']}
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        console.log(bag)
    }
};
// 去重
const unique = function (arr) {
    return Array.from(new Set(arr))
};
// 1秒钟从redis中取一次, 处理后放到bag中存储
timer = setInterval(function () {
    client.spop("purify_css_queue", function (err, data) {
        if (err) throw new Error('redis 出现异常！');
        if (!data) return;

        processDataFromRedis(data);
    })
}, 1000);
// 退出
process.on("exit", function (code) {
    //进行一些清理工作
    console.log("exiting...", code);
    clearInterval(timer);
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
}

const getOptions = (options = {}) => {
    let opt = {}
    for (let option in OPTIONS) {
        opt[option] = options[option] || OPTIONS[option]
    }
    return opt
}
// 压缩
const minify = (cssSource, options) =>
    new CleanCss(options).minify(cssSource).styles

// 入口函数
const purify = (allWords, css, options, callback) => {
    if (typeof options === "function") {
        callback = options
        options = {}
    }
    options = getOptions(options)
    //cssString为css源码
    let cssString = FileUtil.filesToSource(css, "css");
    // content为class使用者
    // content = FileUtil.filesToSource(searchThrough, "content")
    PrintUtil.startLog(minify(cssString).length)

    let content = obj2Array(allWords);
    let wordsInContent = getAllWordsInContent(content), // 一个对象
        // options.whitelist是一个关键字数组
        // 添加白名单的一些key到map里面，同时所有信息都挂在返回的对象上面
        selectorFilter = new SelectorFilter(wordsInContent, options.whitelist),
        tree = new CssTreeWalker(cssString, [selectorFilter])

    tree.beginReading()
    let source = tree.toString()

    source = options.minify ? minify(source, options.cleanCssOptions) : source

    // Option info = true
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

// 测试结果
setTimeout(() => {
    purify(bag[Object.keys(bag)[0]], 'body{height:40px} .no-use{width:2px} p{span{position: relative}}', data => {
        console.log(data)
    })
}, 30 * 1000)
