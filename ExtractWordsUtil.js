const addWord = (words, word) => {
    if (word) words.push(word)
}

// 此函数控制数据集
const getAllWordsInContent = words => {
    let used = {
        // Always include html and body.
        html: true,
        body: true
    };

    // 非字母当作分隔符，返回一个对象，key不含 . 和 #
    // const words = content.split(/[^a-z]/g)
    for (let word of words) {
        used[word] = true
    }
    return used
}

const obj2Array = obj => {

    let fromAll = obj['IDs_from_js']
        .concat(obj['classes_from_js'])
        .concat(obj['IDs_from_html'])
        .concat(obj['classes_from_html']);

        return Array.from(new Set(fromAll));
}

const getAllWordsInSelector = selector => {
    // Remove attr selectors. "a[href...]"" will become "a".
    selector = selector.replace(/\[(.+?)\]/g, "").toLowerCase()
    // If complex attr selector (has a bracket in it) just leave
    // the selector in. ¯\_(ツ)_/¯
    if (selector.includes("[") || selector.includes("]")) {
        return []
    }
    let skipNextWord = false,
        word = "",
        words = []

    for (let letter of selector) {
        if (skipNextWord && !(/[ #.]/).test(letter)) continue
        // If pseudoclass or universal selector, skip the next word
        if (/[:*]/.test(letter)) {
            addWord(words, word)
            word = ""
            skipNextWord = true
            continue
        }
        if (/[a-z]/.test(letter)) {
            word += letter
        } else {
            addWord(words, word)
            word = ""
            skipNextWord = false
        }
    }

    addWord(words, word)
    return words
}

module.exports = {
    getAllWordsInSelector,
    getAllWordsInContent,
    obj2Array
}