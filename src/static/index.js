(function (window, $) {
	'use strict';
	 window.indexServer = indexServer();

	 function indexServer () {
	 	let indexServer = {
	 		treeData: [],
	 		zTreeObj: null
	 	}

	 	$(function () {
			indexServer.getJSONData()
	 	})

	 	indexServer.getJSONData = function () {
	 		$.ajax('menu.json').done((data) => {
	 			indexServer.treeData = data
	 		}).done(() => {
	 			indexServer.initTree()
	 		})
	 	}

	 	indexServer.initTree = function () {
		    // zTree 的参数配置，深入使用请参考 API 文档（setting 配置详解）
		    const setting = {
		    	view: {
						dblClickExpand: false,
						nameIsHTML: true
		    	},
		    	data: {
				    key: {
								name: "title",
								children: "childs"
				    }
			    },
			    callback: {
			    	onClick: onNodeClick
			    	// beforeExpand: zTreeBeforeExpand
			    }
		    }
		    // zTree 的数据属性，深入使用请参考 API 文档（zTreeNode 节点数据详解）
		    const zNodes = indexServer.treeData

			indexServer.zTreeObj = $.fn.zTree.init($("#tree"), setting, zNodes);
			var nodes = indexServer.zTreeObj.getNodes();
			if (nodes.length > 0) {
				for(var i=0;i<nodes.length;i++){
					indexServer.zTreeObj.expandNode(nodes[i], true, false, false);
				}
			}
		}

	 	// callback
		function onNodeClick(e,treeId, treeNode) {
			e.preventDefault()
			$("#iframe").attr("src", treeNode.url)
			// indexServer.zTreeObj.expandAll(false)
	        indexServer.zTreeObj.expandNode(treeNode)
	    }

	    function zTreeBeforeExpand (treeId, treeNode) {
	    	keepExpandSingle(treeNode);
        	return true;
	    }

	    function keepExpandSingle(currNode) {
	        //console.log(currNode);
	        //节点级别，即节点展开的等级，是爸爸辈还是儿子辈
	        var cLevel = currNode.level;
	        //这里假设id是唯一的
	        var cId = currNode.id;
	        //此对象可以保存起来，没有必要每次查找
	        var treeObj = $.fn.zTree.getZTreeObj("treeDemo");
	        /**
	         * 展开的所有节点，这是从父节点开始查找（也可以全文查找）
	         * 从当前节点的父节点开始查找，看有没有打开的节点，如果有则判断，若为同一级别的不同节点，则关闭，否则不关闭
	        */
	        var expandedNodes = treeObj.getNodesByParam("open", true, currNode.getParentNode());
	        console.log(expandedNodes);
	        for(var i = expandedNodes.length - 1; i >= 0; i--){
	            var node = expandedNodes[i];
	            var level = node.level;
	            var id = node.id;
	            if (cId != id && level == cLevel) {
	                treeObj.expandNode(node, false);
	            }
	        }
	    }
	 	return indexServer
	}
})(window, jQuery)