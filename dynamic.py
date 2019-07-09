# -*- coding:utf-8 -*-

import os
import sys
import json
import redis
from threading import Timer
from urllib.parse import urlparse

from selenium import webdriver

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

option = webdriver.ChromeOptions()
option.add_argument('--headless')
option.add_argument('--disable-gpu')

driver = webdriver.Chrome(options=option)


def getTokens():
    # 取出js操作部分的classes, ids 顺便去重
    classes_from_js = driver.execute_script("tokenMap.classes = Array.from(tokenMap.classes);tokenMap.IDs = Array.from(tokenMap.IDs);return tokenMap;")
    r.sadd('purify_css_queue', json.dumps(classes_from_js))
    # sys.stdout.flush()
    Timer(3, getTokens).start()


curPath = os.path.abspath(os.path.dirname(__file__))
file_object = open(os.path.join(curPath, "inject.js"), 'r', encoding='UTF-8')

try:
    # file_context是一个string，读取完后，就失去了对原文件引用
    file_context = file_object.read()
finally:
    # 关闭文件
    file_object.close()

# 注入hook代码, 注意返回值并不是js代码的返回值，而是一个script描述符
driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {"source": file_context})

# 去访问指定的url
driver.get(sys.argv[1])

eles = driver.find_elements_by_tag_name('*')

# 存储页面实际上用到的 class, id
classes_from_html = []
IDs_from_html = []

for ele in eles:
    oneClass = ele.get_attribute("class") and ele.get_attribute("class").split(' ')
    IDs_from_html.append(ele.get_attribute("id")) if ele.get_attribute("id") else None

    for i in oneClass:
        classes_from_html.append(i)

classes_from_html = list(set(classes_from_html))
IDs_from_html = list(set(IDs_from_html))

parsed_uri = urlparse(driver.current_url)
domain = '{uri.netloc}'.format(uri=parsed_uri)

r.sadd('purify_css_queue', json.dumps({"host": domain,"classes_from_html": classes_from_html}))
# sys.stdout.flush()

r.sadd('purify_css_queue', json.dumps({"host": domain,"IDs_from_html": IDs_from_html}))
# sys.stdout.flush()

# TODO 执行一些尽可能使js覆盖率更广的操作，比如用户操作，登陆，测试脚本等，此处决定了动态的效果
# ... ...

getTokens()
