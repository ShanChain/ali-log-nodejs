'use strict';
let _ = require('lodash');
let path = require('path');
let util = require('./util');
let qs = require('querystring');
let request = require('request');
let protobuf = require('protobufjs');
let Exception = require('./Exception');


const API_VERSION = '0.6.0';
const USER_AGENT = 'log-nodejs-sdk';
//日志数据Message文件路径
const SLS_PROTO = path.join(__dirname, 'sls.proto');


//构建Message对象
let builder = protobuf.loadProtoFile( SLS_PROTO );
let Log = builder.build('log');


module.exports = Aliyun_Log_Client;

var client = Aliyun_Log_Client.prototype;

/**
 * Aliyun_Log_Client Constructor 
 * @param {Object} options Options
 */
function Aliyun_Log_Client( options ) {
  options = options || {};
  this.project = options.project || null;
  this.accessKey = options.accessKey;
  this.accessKeySecret = options.accessKeySecret;
  this.stsToken = options.stsToken || '';
  this.source = util.getLocalIp();   // @var string the local machine ip address.
  this._setEndpoint( options.endpoint );
}


/**
 * SetEndpoint
 * @param {String} endpoint Endpoint
 */
client._setEndpoint = function( endpoint ) {
  let position;
  position = endpoint.indexOf('://');
  if (position > -1) {
    position += 3;
    endpoint = endpoint.substring( position );
  }
  position = endpoint.indexOf('/');
  if (position > -1) {
    endpoint = endpoint.substring( 0, position );
  }
  position = endpoint.indexOf(':');
  if (position > -1) {
    this.port = Number(endpoint.substring( position + 1 ));
    endpoint = endpoint.substring( 0, position );
  } else {
    this.port = 80;
  }
  this.isRowIp = util.isIp( endpoint );
  this.logHost = endpoint;
  this.endpoint = `${ endpoint }:${ this.port }`;
}


/**
 * 检验参数project
 * @param  {Object} args 请求参数
 */
client._checkProject = function(args) {
  if (this.project && !args.project) {
    args.project = this.project;
  }
  if (!args.project) {
    throw Exception.ParameterProjectInvalid();
  }
  return args.project;
}


/**
 * 初始化请求信息
 * @param  {String}   method   请求方法名称
 * @param  {String}   project  日志项目名称
 * @param  {String|Buffer}   body  请求主体
 * @param  {String}   resource  资源地址
 * @param  {Object}   params   query 
 * @param  {Object}   headers  请求头部信息
 * @param  {Function} callback 回调函数
 * @return void
 */
client._send = function(method, project, body, resource, params, headers, callback) {
  if (!_.isEmpty(body)) {
    if (headers['x-log-bodyrawsize'] === undefined) {
      headers['x-log-bodyrawsize'] = 0;
    }
    if (headers['Content-Type'] === undefined) {
      headers["Content-Type"] = "application/json";
    }
    headers['Content-Length'] = body.length;
    headers['Content-MD5'] = util.md5(body).toUpperCase();
  } else {
    headers['Content-Type'] = '';  // If not set, http request will add automatically.
    headers['Content-Length'] = 0;
    headers['x-log-bodyrawsize'] = 0;
  }
  headers['Date'] = util.getGMT();
  headers['User-Agent'] = USER_AGENT;
  headers['x-log-apiversion'] = API_VERSION;
  headers['x-log-signaturemethod'] = 'hmac-sha1';
  if (this.stsToken !== '') headers['x-acs-security-token'] = this.stsToken;
  if (!project) {
    headers['Host'] = this.logHost;
  } else {
    headers['Host'] = `${ project }.${ this.logHost }`;
  }
  //签名
  let signature = util.getRequestAuthorization(method, resource, this.accessKeySecret, this.stsToken, params, headers);
  //Authorization头的格式 [ Authorization:LOG <AccessKeyId>:<Signature> ]
  headers['Authorization'] = `LOG ${ this.accessKey }:${ signature }`;

  let url = resource;
  if (!_.isEmpty( params )) url += `?${ qs.stringify( params ) }`;
  if (this.isRowIp) {
    url = `http://${ this.endpoint }${ url }`;
  } else {
    if (!project) {
      url = `http://${ this.endpoint }${ url }`;
    } else {
      url = `http://${ project }.${ this.endpoint }${ url }`;
    }
  }
  this._sendRequest( method, url, body, headers, function(err, headers, result) {
    if (err) {
      callback && callback(err);
    } else {
      callback && callback(null, headers, result);
    }
  });
}


/**
 * _getResponse
 * @param  {[type]}   options  [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
client._getResponse = function (options, callback) {
  request(options, function(err, response, body) {
    if (err) {
      callback && callback(err); return;
    }
    try {
      body = JSON.parse(body);
    } catch(err) {}
    let headers = response.headers,
        requestId = headers['x-log-requestid'] || '';
    if (response.statusCode === 200) {
      let res = new Object();
      body && (res.res = body);
      res.requestId = requestId;
      callback && callback(null, res);
    } else {
      if (body.errorCode && body.errorMessage) {
        let err = new Exception(body.errorCode, body.errorMessage, requestId);
        callback && callback(err);
      } else {
        let err = new Exception('RequestError', `Request is failed. Http code is ${ response.statusCode }.The return json is ${ JSON.stringify(body) }`, requestId);
        callback && callback(err);
      }
    }
  })
}


/**
 * 发起调用阿里云API请求
 * @param  {String}   method   请求方法名称
 * @param  {String}   url      请求API地址
 * @param  {String|aa Buffer}   body   请求主体
 * @param  {Object}   headers  请求头部信息
 * @param  {Function} callback  回调函数 
 * @return void
 */
client._sendRequest = function(method, url, body, headers, callback) {
  let options = {};
  options.url = url;
  options.method = method;
  options.headers = headers;
  if (headers.Accept == 'application/x-protobuf') {
    options.encoding = null;
  }
  //POST与PUT请求发送body
  if (method == 'POST' || method == 'PUT') options.body = body;
  this._getResponse(options, function(err, res) {
    if (err) {
      callback && callback(err);
    } else {
      callback && callback(null, res);
    }
  })
}


/**
 * 获取日志库列表
 * @param  {String}   args  项目名称
 * @param  {Function} callback 回调函数
 * @return void
 */
client.listLogstores = function(args, callback) {
  let project = this._checkProject(args);
  let params = new Object(),
      resource = `/logstores`;
  if (args.size !== undefined) {
    params.size = args.size;
  }
  if (args.offset !== undefined) {
    params.offset = args.offset;
  }
  if (args.logstoreName !== undefined) {
    params.logstoreName = args.logstoreName;
  }
  this._send('GET', project, null, resource, params, {}, callback);
}


/**
 * 创建日志库 ( CreateLogstore )
 * @param {Object}   args      创建日志库信息
 * @param {Function} callback     回调函数
 */
client.CreateLogstore = function(args, callback) {
  let project = this._checkProject(args);
  let body = {},
      headers = {},
      resource = `/logstores`;
  headers["x-log-bodyrawsize"] = 0;
  body.ttl = Number(args.ttl);
  body.logstoreName = args.logstoreName;
  body.shardCount = Number(args.shardCount);
  try {
    body = JSON.stringify(body);
  } catch(err) {
    callback && callback(err);
  }
  this._send('POST', project, body, resource, {}, headers, callback);
}

/**
 * 删除Logstore (包括所有shard数据，以及索引等)
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.DeleteLogstore = function (args, callback) {
  let project = this._checkProject(args),
      resource = `/logstores/${args.logstoreName}`;
  this._send('DELETE', project, null, resource, {}, {}, callback);
}


/**
 * 更新Logstore属性 (前只支持更新ttl，shard属性)
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.UpdateLogstore = function (args, callback) {
  let project = this._checkProject(args);
  let body = {},
      resource = `/logstores/${args.logstoreName}`;
  body.ttl = args.ttl;
  body.shardCount = args.shardCount;
  body.logstoreName = args.logstoreName;
  try {
    body = JSON.stringify(body);
  } catch(err) {
    callback && callback(err);
  }
  this._send('PUT', project, body, resource, {}, {}, callback);
}


/**
 * 查看Logstore属性
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.GetLogstore = function (args, callback) {
  let project = this._checkProject(args);
  let resource = `/logstores/${args.logstoreName}`;
  this._send('GET', project, null, resource, {}, {}, callback);
}


/**
 * 列出logstore下当前所有可用shard
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.ListShards = function (args, callback) {
  let project = this._checkProject(args);
  let resource = `/logstores/${args.logstoreName}/shards`;
  this._send('GET', project, null, resource, {}, {}, callback);
}


/**
 * Split一个指定的readwrite状态的shard
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.SplitShard = function (args, callback) {
  let project = this._checkProject(args);
  let body = {},
      params = {},
      resource = `/logstores/${args.logstoreName}/shards/${args.shardid}`; 
  body.logstoreName = args.logstoreName;
  body.shardid = args.shardid;
  body.splitkey = args.splitkey;
  params.action = 'split';
  params.key = args.args.splitkey;
  try {
    body = JSON.stringify(body);
  } catch(err) {
    callback && callback(err);
  }
  this._send('POST', project, body, resource, params, {}, callback);
}


/**
 * Merge两个相邻的readwrite状态的shards
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.MergeShards = function (args, callback) {
  let project = this._checkProject(args);
  let body = {},
      params = {},
      resource = `/logstores/${args.logstoreName}/shards/${args.shardid}`;
  params['action'] = 'merge';
  this._send('POST', project, body, resource, params, {}, callback);
}


/**
 * 删除一个readonly状态的shard。
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.DeleteShard = function (args, callback) {
  let project = this._checkProject(args);
  let resource = `/logstores/${args.logstoreName}/shards/${args.shardid}`;
  this._send('DELETE', project, null, resource, {}, {}, callback);
}


/**
 * 根据时间获得游标
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.GetCursor = function (args, callback) {
  let project = this._checkProject(args);
  let params = {};
  params.type = 'cursor';
  params.from = args.from;
  let resource = `/logstores/${args.logstoreName}/shards/${args.shardid}`;
  this._send('GET', project, null, resource, params, {}, callback);
}


/**
 * 根据游标、数量获得日志
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */


client.PullLogs = function (args, callback) {
  let project = this._checkProject(args);
  let params = {},
      headers = {},
      resource = `/logstores/${args.logstoreName}/shards/${args.shardid}`;
  params.type = 'logs';
  params.count = args.count;
  params.cursor = args.cursor;
  headers['Accept-Encoding'] = 'deflate';
  headers.Accept = 'application/x-protobuf';
  this._send('GET', project, null, resource, params, headers, function(err, res) {
    if (err) {
      callback && callback(err);
    } else {
      try {
        util.inflate(res.res, function(err, res) {
          if (err) {
            callback && callback(err);
          } else {
            let result = Log.LogGroupList.decode(res);
            callback && callback(null, result);
          }
        })
      } catch(err) {
        callback && callback(err);
      }
    }
  });
}


/**
 * 查询指定Project下某个Logstore中日志数据
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.GetLogs = function (args, callback) {
  let project = this._checkProject(args);
  let params = {},
      headers = {},
      resource = `/logstores/${args.logstoreName}`;
    params.type = 'log';
    params.from = args.from;
    params.to = args.to;
    if (args.line !== undefined) {
      params.line = args.line;
    }
    if (args.query !== undefined) {
      params.query = args.query;
    }
    if (args.topic !== undefined) {
      params.topic = args.topic;
    }
    if (args.offset !== undefined) {
      params.offset = args.offset;
    }
    if (args.reverse !== undefined) {
      params.reverse = args.reverse;
    }
    this._send('GET', project, null, resource, params, {}, callback);
}


/**
 * 查询指定Project下某个Logstore中日志的分布情况
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.GetHistograms = function (args, callback) {
  let project = this._checkProject(args);
  let params = {},
      resource = `/logstores/${args.logstoreName}`;
  params.type = 'histogram';
  params.from = args.from;
  params.to = args.to;
  args.topic && (params.topic = args.topic);
  args.query && (params.query = args.query);
  this._send('GET', project, null, resource, params, {}, callback);
}


/**
 * 查询日志投递任务状态。
 * @param {Object}   args     请求参数
 * @param {Function} callback 回调函数
 */
client.GetShipperStatus = function (args, callback) {
  let project = this._checkProject(args);
  let params = {},
      resource = `/logstores/${args.logstoreName}/shipper/${args.shipperName}/tasks`;
  params.from = args.from;
  params.to = args.to;
  params.size && (params.size = args.size);
  params.status && (params.status = args.status);
  params.offset && (params.offset = args.offset);
  this._send('GET', project, null, resource, params, {}, callback);
}


/**
 * 向指定LogStore写入日志数据
 * @param {String}   logstoreName LogStore名称
 * @param {Object}   data         日志信息
 * @param {Function} callback     回调函数
 */
client.PostLogStoreLogs = function(args, callback) {
  let self = this,
      headers = {},
      data = args.data,
      project = this._checkProject(args),
      resource = `/logstores/${ args.logstoreName }`;
  //接口每次可以写入的日志数据量上限4096条
  if (data.logs.length > 4096) {
    throw Exception.InvalidLogSize("logItems' length exceeds maximum limitation: 4096 lines." );
  }
  //根据protobuf Message格式组装数据
  let group = new Object();
  group.topic = data.topic;
  group.source = data.source;
  group.logs = new Array();
  try {
    data.logs.forEach( function(logItem) {
      let log = new Object();
      log.time = logItem.time;
      log.contents = new Array();
      logItem.contents.forEach( function(prop) {
        let content = new Object();
        content.key = prop.key;
        content.value = prop.value;
        log.contents.push(content);
      })
      group.logs.push( log );
    })
  } catch (err) {
    callback && callback(err); return;
  }

  let LogGroup = Log.LogGroup;
  //转换为Protocol Buffer
  let logger = new LogGroup(group).toBuffer();
  let body = logger;

  let bodySize = body.length;
  //接口每次可以写入的日志数据量上限为3MB
  if (bodySize > 3 * 1024 * 1024) {  
    throw Exception.InvalidLogSize("logItems' size exceeds maximum limitation: 3 MB.");
  }
  headers ["x-log-bodyrawsize"] = bodySize;
  headers ['x-log-compresstype'] = 'deflate';
  headers ['Content-Type'] = 'application/x-protobuf';
  // deflate类型压缩内容 
  util.deflate( body, function(err, buf) {
    if (err) throw err;
    self._send('POST', project, buf, resource, {}, headers, callback);
  })
  
}

