const express = require('express');
const path = require('path');
const connectHistoryApiFallback = require('connect-history-api-fallback');

const app = express();
app.use('/', connectHistoryApiFallback());
app.use('/', express.static(path.join(__dirname, '/dist')));

const server = app.listen(5901, ()=>{console.log('server start on 5901...')})
