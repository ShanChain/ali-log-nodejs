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
const SLS_PROTO = path.join(process.cwd(), 'sls.proto');


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
  let pos;
  pos = endpoint.indexOf('://');
  if (pos > -1) {
    pos += 3;
    endpoint = endpoint.substring( pos );
  }
  pos = endpoint.indexOf('/');
  if (pos > -1) {
    endpoint = endpoint.substring( 0, pos );
  }
  pos = endpoint.indexOf(':');
  if (pos > -1) {
    this.port = Number(endpoint.substring( pos + 1 ));
    endpoint = endpoint.substring( 0, pos );
  } else {
    this.port = 80;
  }
  this.isRowIp = util.isIp( endpoint );
  this.logHost = endpoint;
  this.endpoint = `${ endpoint }:${ this.port }`;
}


/**
 * 初始化请求信息
 * @param  {String}   method   请求方法名称
 * @param  {String}   project  日志项目名称
 * @param  {String|Buffer}   body  请求主体
 * @param  {String}   resource 
 * @param  {Object}   params   query 
 * @param  {Object}   headers  请求头部信息
 * @param  {Function} callback 回调函数
 * @return void
 */
client._send = function(method, project, body, resource, params, headers, callback) {
  if (body) {
    headers['Content-Length'] = body.length;
    if (headers['x-log-bodyrawsize'] === undefined) {
      headers['x-log-bodyrawsize'] = 0;
    }
    headers['Content-MD5'] = util.md5(body).toUpperCase();
  } else {
    headers['Content-Length'] = 0;
    headers['x-log-bodyrawsize'] = 0;
    headers['Content-qType'] = '';  // If not set, http request will add automatically.
  }
  headers['User-Agent'] = USER_AGENT;
  headers['x-log-apiversion'] = API_VERSION;
  headers['x-log-signaturemethod'] = 'hmac-sha1';

  if (this.stsToken !== '') {
    headers['x-acs-security-token'] = this.stsToken;
  }
  if (!project) {
    headers['Host'] = this.logHost;
  } else {
    headers['Host'] = `${ project }.${ this.logHost }`;
  }
  headers['Date'] = util.getGMT();

  let signature = util.getRequestAuthorization(method, resource, this.accessKeySecret, this.stsToken, params, headers);
  headers['Authorization'] = `LOG ${ this.accessKey }:${ signature }`;

  let url = resource;
  if (!_.isEmpty( params )) {
    url += `?${ qs.stringify( params ) }`;
  }
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
 * 发起调用阿里云API请求
 * @param  {String}   method   请求方法名称
 * @param  {String}   url      请求API地址
 * @param  {String|Protocol Buffer}   body   请求主体
 * @param  {Object}   headers  请求头部信息
 * @param  {Function} callback  回调函数 
 * @return void
 */
client._sendRequest = function(method, url, body, headers, callback) {
  let options = {
    url : url,
    method : method,
    headers : headers
  }
  if (method == 'POST' || method == 'PUT') options['body'] = body;
  request(options, function( err, response, body ) {
    if (err) {
      callback && callback(err); return;
    } 
    try {
      body = JSON.parse(body);
    } catch(err) {}
    let headers = response.headers;
    if (response.statusCode === 200) {
      callback && callback( null, headers, body );
    } else {
      let requestId = headers['x-log-requestid'] ? headers['x-log-requestid'] : '';
      if (body['errorCode'] && body['errorMessage']) {
        let err = new Exception(body['errorCode'], body['errorMessage'], requestId);
        callback && callback(err);
      } else {
        let err = new Exception('RequestError', `Request is failed. Http code is ${ response.statusCode }.The return json is ${ JSON.stringify(body) }`, requestId);
        callback && callback(err);
      }
    }
  })
}


/**
 * 获取日志库列表
 * @param  {String}   project  项目名称
 * @param  {Function} callback 回调函数
 * @return void
 */
client.listLogstores = function(callback) {
  let body = null;
  let params = {};
  let headers = {};
  let method = 'GET';
  let resource = '/logstores';
  let project = this.project;
  this._send(method, project, body, resource, params, headers, callback);
}


/**
 * 创建日志库 ( CreateLogstore )
 * @param {Object}   options      创建日志库信息
 * @param {Function} callback     回调函数
 */
client.CreateLogstore = function(options, callback) {
  let body = {};
  let params = {};
  let headers = {};
  let method = 'POST';
  let project = this.project;
  let resource = '/logstores';
  headers["x-log-bodyrawsize"] = 0;
  headers["Content-Type"] = "application/json";
  body['ttl'] = Number(options.ttl);
  body['logstoreName'] = options.logstoreName;
  body['shardCount'] = Number(options.shardCount);
  try {
    body = JSON.stringify(body);
  } catch(err) {
    callback && callback(err);
  }
  this._send(method, project, body, resource, params, headers, callback);
}

/**
 * 向指定LogStore写入日志数据
 * @param {String}   logstoreName LogStore名称
 * @param {Object}   data         日志信息
 * @param {Function} callback     回调函数
 */
client.PostLogStoreLogs = function(logstoreName, data, callback) {
  let self = this;
  let params = {};
  let headers = {};
  let method = 'POST';
  let project = this.project;
  let resource = `/logstores/${ logstoreName }`;
  //接口每次可以写入的日志数据量上限4096条
  if (data.logs.length > 4096) {
    throw new Exception ( 'InvalidLogSize', "logItems' length exceeds maximum limitation: 4096 lines." );
  }
  //根据protobuf Message格式组装数据
  let group = new Object();
  group['topic'] = data.topic;
  group['source'] = data.source;
  group['logs'] = new Array();

  data.logs.forEach( function(logItem) {
    let log = new Object();
    log['time'] = logItem.time;
    log['contents'] = new Array();
    logItem.contents.forEach( function(prop) {
      let content = new Object();
      content['key'] = prop['key'];
      content['value'] = prop['value'];
      log.contents.push( content );
    })
    group['logs'].push( log );
  })

  let LogGroup = Log.LogGroup;
  //转换为Protocol Buffer
  let logger = new LogGroup(group).toBuffer();
  let body = logger;

  let bodySize = body.length;
  //接口每次可以写入的日志数据量上限为3MB
  if (bodySize > 3 * 1024 * 1024) {  
    throw new Exception ('InvalidLogSize', "logItems' size exceeds maximum limitation: 3 MB.");
  }
  headers ["x-log-bodyrawsize"] = bodySize;
  headers ['x-log-compresstype'] = 'deflate';
  headers ['Content-Type'] = 'application/x-protobuf';
  //压缩内容
  util.deflate( body, function(err, buf) {
    if (err) throw err;
    self._send('POST', self.project, buf, resource, params, headers, callback);
  })
  
}

