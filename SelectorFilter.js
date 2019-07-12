const {getAllWordsInSelector} = require("./ExtractWordsUtil");

const isWildcardWhitelistSelector = selector => {
    return selector[0] === "*" && selector[selector.length - 1] === "*"
}

const hasWhitelistMatch = (selector, whitelist) => {
    for (let el of whitelist) {
        if (selector.includes(el)) return true
    }
    return false
}

class SelectorFilter {
    constructor(contentWords, whitelist) {
        this.contentWords = contentWords
        this.rejectedSelectors = []
        this.wildcardWhitelist = []
        this.parseWhitelist(whitelist)
    }

    initialize(CssSyntaxTree) { // 监听 readRule
        CssSyntaxTree.on("readRule", this.parseRule.bind(this))
    }

    parseWhitelist(whitelist) {
        whitelist.forEach(whitelistSelector => {
            whitelistSelector = whitelistSelector.toLowerCase()

            if (isWildcardWhitelistSelector(whitelistSelector)) {
                // If '*button*' then push 'button' onto list.
                this.wildcardWhitelist.push(
                    whitelistSelector.substr(1, whitelistSelector.length - 2)
                )
            } else {
                // 把白名单的key 合并进去
                getAllWordsInSelector(whitelistSelector).forEach(word => {
                    this.contentWords[word] = true
                })
            }
        })
    }

    parseRule(selectors, rule) {
        rule.selectors = this.filterSelectors(selectors)
    }

    filterSelectors(selectors) {
        let contentWords = Object.keys(this.contentWords),
            rejectedSelectors = this.rejectedSelectors,
            wildcardWhitelist = this.wildcardWhitelist,
            usedSelectors = []

        selectors.forEach(selector => {
            // 新增加：凡是tag选择器和属性选择器 都留下 ??? 这里的 selector 不包含 . # 之类的
            if ((selector.indexOf('#') === -1) && (selector.indexOf('.') === -1)) { // 标签选择器 or 属性选择器，全部留下
                usedSelectors.push(selector)
                return
            }

            if (hasWhitelistMatch(selector, wildcardWhitelist)) {
                usedSelectors.push(selector)
                return
            }

            for (let word of contentWords) {
                if ((selector.indexOf(word + " ") > -1) ||
                    (selector.indexOf(word + ",") > -1) ||
                    (selector.indexOf(word + ":") > -1) ||
                    (selector === word)) {
                    usedSelectors.push(selector);
                    return;
                }
            }

            rejectedSelectors.push(selector);
        })

        return usedSelectors
    }
}

module.exports = SelectorFilter
