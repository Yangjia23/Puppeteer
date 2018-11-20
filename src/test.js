const puppeteer = require('puppeteer');
const path = require('path');
const https = require('https');
const fs = require('fs');
const rm = require('rimraf');
const pretty = require('pretty');

const log = console.log;

const settings = {
  headless: true,
  defaultViewport: {
  	width: 1200,
  	height: 800
  }
}

// 简单配置
const config = {
	replaceUrl: 'https://zoomcharts.com/developers/en/net-chart/api-reference/',
	// HTML 输出路径
	documentPath: 'document/',
	// img 输出路径
	imgPath: 'images/',
	// JSON
	jsonPath: './menu.json',
	// full-reference
	fullReference: 'full-reference/'
}

// 返回路经
function resolve(dir, dir2 = '') {
	return path.posix.join(__dirname, './', dir, dir2);
}


async function main () {
  const browser = await puppeteer.launch(settings)
  try {
  	const page = await browser.newPage()
  	page.setDefaultNavigationTimeout(600000)
  	page.on('console', msg => {
			for (let i = 0; i < msg.args().length; ++i) {
				console.log(`${i}: ${msg.args()[i]}`);
			}
		});


		await page.evaluateOnNewDocument(() => {
			// 遍历Dom 树
			window.walkDOM = (node) => {
					if (node === null) {
						return
					}
					if (node.tagName === 'A' && node.className.indexOf('drop') > -1) {
						node.click()
					}
					node = node.firstElementChild
					while (node) {
						walkDOM(node)
						node = node.nextElementSibling
					}
			}

			window.DFSTraverse = (rootNode, linkList = []) => {
				const roots = [rootNode];
				while (roots.length) {
					const root = roots.shift()
					if (root.tagName === 'LI') {
						let menuItem = {
							title: root.firstElementChild.innerHTML,
							url: root.firstElementChild.href.replace('https://zoomcharts.com/developers/en/net-chart/', './document/'),
							childs: []
						}
						if (root.firstElementChild !== root.lastElementChild) {
							Array.from(root.lastElementChild.children ).forEach(item => {
								menuItem.childs.concat(DFSTraverse(item, menuItem.childs))
							})
						}
						if (!menuItem.childs.length) {
							delete menuItem.childs
						}
						if (menuItem.url) {
							linkList.push(menuItem)
						}
					}
				}
				return linkList
			}
		});

		// create project
		function createProject (path) {
			let outputPath = resolve(path);
			const isExists = fs.existsSync(outputPath)
			console.log('isExists', isExists, 'outputPath', outputPath);

			// 如果不存在 则创建
			if(!isExists){
				mkdirOutputpath(outputPath);
			}
			else{
				// 存在，则删除
				rm(outputPath, (err) => {
					if(err) throw err;
					console.log('remove the files is successful!');
					mkdirOutputpath(outputPath);
				});
			}
		}

		// 创建输出路径
		function mkdirOutputpath(path){
			try{
				fs.mkdirSync(path);
				console.log('mkdir is successful!');
			} catch(e){
				console.log('mkdir is failed!', e);
			}
		};

		createProject(config.documentPath)
		createProject(config.imgPath)
		createProject(config.fullReference)

    await page.goto('https://zoomcharts.com/developers/en/introduction.html')

		// 一、爬取 Full Reference
		console.log('Full Reference Start')
		await page.waitForSelector('#menu > ul > li:last-child > a').then(async () => {
    	await page.click('#menu > ul > li:last-child > a')
    })

		await page.waitFor(1000)

    let fullChartLinkArr = await page.evaluate(() => {
    	let aLinks = [...document.querySelectorAll('#menu > ul > li:last-child > ul > li  a[href]')];
    	let filterResult = aLinks.filter((a) => {
					return !(/^.+full-reference\/[GeoChart | TimeChart | ]\w+\.html/.test(a.href))
			});
    	return filterResult.map((a) => {
				let text = a.innerText.indexOf('.') !== -1 ? a.innerText.split('.')[1] : (a.innerText.indexOf(':') !== -1 ? a.innerText.split(':')[1].trim() : a.innerText);
				let href = a.href.trim();
				return {
					href: href,
					text: text.trim()
				}
			});
    })

    console.log('fullChartLinkArr.length', fullChartLinkArr.length);

    for (let j = 0, len = fullChartLinkArr.length; j < len; ++j) {
    	let a = fullChartLinkArr[j]
			await page.goto(a.href, {waitUntil: 'networkidle0'});
			console.log('go to:' + a.href);
			await page.waitFor(2000);

			const page_html = await page.evaluate((el) => {
				return `<link rel="stylesheet" type="text/css" href="/static/iframe.css">
								<div id="page">
										${el.innerHTML}
								</div>
								<script type="text/javascript" src="/lib/zTree/jquery-3.3.1.min.js"></script>
								<script type="text/javascript" src="/static/iframe.js"></script>`
			}, await page.$('#page'))

			const fileName = `${a.text}.html`
			let ws = fs.createWriteStream(resolve(config.fullReference, fileName))
			ws.write(page_html);
			console.log(`Now, save the ${a.text}.html to ${config.fullReference} successful`);
			ws.end()
    }

    console.log('fullChartLinkArr end')

    console.log('<------------------->')
    // 二. 爬取Net-Settings
    console.log('Net-Settings start')
    await page.waitForSelector('#menu > ul > li:nth-child(5) > a').then(async () => {
    	await page.click('#menu > ul > li:nth-child(5) > a')
    })

    await page.waitFor(1000)

    // 实现 Net Chart 目录下所有 `a.drop` 元素的点击事件
    await page.evaluate(async () => {
    	const rootNode = document.querySelector('#menu > ul > li:nth-child(5) > ul > li:nth-child(5)')
    	await window.walkDOM(rootNode)
		})

    // 生成目录树的JSON 文件
    await page.waitFor(2000)

    const menu = await page.evaluate(async () => {
    	const rootNode = document.querySelector('#menu > ul > li:nth-child(5) > ul > li:nth-child(5)')
    	let menu = await window.DFSTraverse(rootNode)
    	return menu
    })

    fs.writeFile(config.jsonPath, JSON.stringify(menu, null, 4), err => {
    	if (err) {
    		console.log(err)
    	} else {
    		console.log("menu data saved to " + config.jsonPath);
    	}
    })

 		let netChartLinkArr = await page.evaluate(() => {
			let aLinks = [...document.querySelectorAll('#menu > ul > li:nth-child(5) > ul > li:nth-child(n + 4) a[href]')];
			let filterResult = aLinks.filter((a) => {
					return a.href.indexOf('#') === -1
			});
			return filterResult.map((a) => {
				let text = a.innerText.indexOf(':') === -1 ? a.innerText : a.innerText.split(':')[0];
				let href = a.href.trim();
				return {
					href: href,
					text: text.trim(),
					dirname: href.replace(/^.+net-chart\/([\w\/\-]+)\/\w+\.html$/,'$1') || ''
				}
			});
		});

		console.log('netChartLinkArr.length', netChartLinkArr.length);

		for (let i = 1; i< netChartLinkArr.length; i++) {
			let a = netChartLinkArr[i]
			await page.goto(a.href, {waitUntil: 'networkidle0'});
			console.log('go to:' + a.href);
			await page.waitFor(2000);

			const page_html = await page.evaluate((el) => {
				return `<link rel="stylesheet" type="text/css" href="/static/iframe.css">
								<div id="page">
										${el.innerHTML}
								</div>
								<script type="text/javascript" src="/lib/zTree/jquery-3.3.1.min.js"></script>
								<script type="text/javascript" src="/static/iframe.js"></script>`
			}, await page.$('#page'))

			const page_title = /[ ]/.test(a.text) ? a.text.split(' ')[1] : a.text

			const fileName = `${page_title.toLowerCase()}.html`
			const filePath = `${config.documentPath}${a.dirname}`
			console.log('create filePath:' + filePath);
			mkdirSync(filePath, 0755, function (e) {
			    if(e){
			        console.log('出错了');
			    }else{
						let ws = fs.createWriteStream(resolve(filePath, fileName))
						ws.write(page_html);
						console.log(`Now, save the ${a.text}.html to ${filePath} successful`);
						ws.end()
			    }
			})

			// 下载图片
			let pathImgs = await page.evaluate(() => {
				let Imgs = [...document.querySelectorAll('#page img[src]')]
				return Imgs.map((img) => {
					console.log(img.src)
					return img.src
				})
			})

			for (let i = pathImgs.length - 1; i >= 0; i--) {
				saveImg(pathImgs[i])
				console.log('save the '+ pathImgs[i] + 'successful')
			}
		}

		function mkdirSync(url, mode, cb) {
	    let arr = url.split("/");
	    mode = mode || 0755;
	    cb = cb || function(){};
	    if(arr[0]==="."){//处理 ./aaa
	        arr.shift();
	    }
	    if(arr[0] == ".."){//处理 ../ddd/d
	        arr.splice(0,2,arr[0]+"/"+arr[1])
	    }
	    function inner(cur){
	        if(!fs.existsSync(cur)){//不存在就创建一个
	          fs.mkdirSync(cur, mode)
	        }
	        if(arr.length){
	          inner(cur + "/"+arr.shift());
	        }else{
	          cb();
	        }
	    }
	    arr.length && inner(arr.shift());
		}

		function saveImg (imgSrc) {
			https.get(imgSrc, res => {
				let imgData = '';
				res.setEncoding('binary');
				res.on('data', (chunk) => {
					imgData += chunk;
				});
				res.on('end', () => {
					let imgName = imgSrc.split('/images/')[1];
					fs.writeFile(resolve(config.imgPath, imgName), imgData, "binary", (err) => {
						console.log(err)
					})
				})
			})
		}

    console.log('服务正常结束')
  } catch (error) {
  	console.log('服务连接超时')
  	console.log(error)
    // await browser.close()
  } finally {
	// process.exit(0)
  }
}

main()
