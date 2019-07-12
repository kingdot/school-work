const UglifyJS = require("uglify-js");
const fs = require("fs");
const glob = require("glob");

const compressCode = code => {
    try {
        // Try to minimize the code as much as possible, removing noise.
        let ast = UglifyJS.parse(code)
        ast.figure_out_scope()
        let compressor = UglifyJS.Compressor({warnings: false})
        ast = ast.transform(compressor)
        ast.figure_out_scope()
        ast.compute_char_frequency()
        ast.mangle_names({toplevel: true})
        code = ast.print_to_string().toLowerCase()
    } catch (e) {
        // If compression fails, assume it's not a JS file and return the full code.
    }
    return code.toLowerCase()
}

const concatFiles = (files, options) =>
    files.reduce((total, file) => {
        let code = ""
        try {
            code = fs.readFileSync(file, "utf8")
            code = options.compress ? compressCode(code) : code
        } catch (e) {
            console.warn(e.message)
        }
        return `${total}${code} `
    }, "")


const getFilesFromPatternArray = fileArray => {
    // 搜集文件信息
    let sourceFiles = {}
    for (let string of fileArray) {
        // 是目录还是文件
        let state = fs.statSync(string)
        if (state.isFile()) {
            sourceFiles[string] = true
        } else {
            const files = glob.sync(string)
            files.forEach(file => {
                sourceFiles[file] = true
            })
        }
    }
    return Object.keys(sourceFiles)
}

const filesToSource = (files, type) => {
    const isContent = type === "content"
    const options = {compress: isContent}
    if (Array.isArray(files)) {
        files = getFilesFromPatternArray(files)
        return concatFiles(files, options)
    }
    // 'files' is already a source string.
    return isContent ? compressCode(files) : files
}

module.exports = {
    concatFiles,
    filesToSource,
    getFilesFromPatternArray
}
