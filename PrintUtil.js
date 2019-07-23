let startTime
let beginningLength

const printInfo = endingLength => {
    const sizeReduction = (((beginningLength - endingLength) / beginningLength) * 100).toFixed(1)
    console.log(`
    ________________________________________________
    |
    |   体积缩减了大约 ~ ${sizeReduction}%  
    |
    ______________________________________________
    `)
}

const printRejected = rejectedTwigs => {
    console.log(`
    ________________________________________________
    |
    |   精简掉的 selectors:  
    |   ${rejectedTwigs.join("\n    |\t")}
    |
    ________________________________________________
    `)
}

const startLog = cssLength => {
    startTime = new Date()
    beginningLength = cssLength
}

module.exports = {
    printInfo,
    printRejected,
    startLog
}
