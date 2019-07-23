# -*- coding:utf-8 -*-

import os
import json
import sys
from urllib.parse import urlparse

from selenium import webdriver

option = webdriver.ChromeOptions()
option.add_argument('--headless')
option.add_argument('--disable-gpu')
option.add_argument('--log-level=3')

driver = webdriver.Chrome(options=option)

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
#driver.get("https://www.baidu.com/")

eles = driver.find_elements_by_tag_name('*')

# 存储页面实际上用到的 class, id
classes_from_html = []
IDs_from_html = []

for ele in eles:
    oneClass = ele.get_attribute("class") and ele.get_attribute("class").split(' ')
    IDs_from_html.append("#" + ele.get_attribute("id")) if ele.get_attribute("id") else None

    for i in oneClass:
        classes_from_html.append("." + i)

classes_from_html = list(set(classes_from_html))
IDs_from_html = list(set(IDs_from_html))

parsed_uri = urlparse(driver.current_url)
domain = '{uri.netloc}'.format(uri=parsed_uri)

total_data = {"host": domain, "classes_from_html": classes_from_html, "IDs_from_html": IDs_from_html}

# TODO 执行一些尽可能使js覆盖率更广的操作，比如用户操作，登陆，测试脚本等，此处决定了动态的效果
# ... ...

# 取出js操作部分的classes, ids 顺便去重
classes_from_js = driver.execute_script("tokenMap.classes = Array.from(tokenMap.classes);tokenMap.IDs = Array.from("
                                        "tokenMap.IDs);return tokenMap;")

driver.quit()

total_data["IDs_from_js"] = classes_from_js["IDs"]
total_data["classes_from_js"] = classes_from_js["classes"]

# 写文件
try:
    dest_file = open(os.path.join(curPath, "py_writing.txt"), 'w', encoding='UTF-8')
    dest_file.write(json.dumps(total_data))
finally:
    dest_file.close()
    os.rename(os.path.join(curPath, "py_writing.txt"), "py_result.txt")



