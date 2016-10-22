'use strict';

let ip = require('ip');
let md5 = require('md5');
let _ = require('lodash');
let zlib = require('zlib');
let crypto = require('crypto');
let Exception = require('./Exception');


module.exports = {

  /**
   * 计算指定内容MD5值
   * @param {String} str Content to signature
   * @return {String} Signature String
   */
  md5 : function(str) {
    return md5(str);
  },
  
  /**
   * 通过Secret Key计算指定内容SHA1
   * @param  {String} content 待签名内容
   * @param  {String} key     阿里云AccessKeySecret
   * @return {String} signature  签名字符串
   */
  hmacSHA1 : function(content, secret) {
    let hmac = crypto.createHmac('sha1', secret);
    let signature = hmac.update(content).digest('base64');
    return signature;
  },

  /**
   * 获取规范日志Headers属性
   * @param  {Object} headers 请求头部
   * @return {String} str  排序后的带有x-log- & x-acs-前缀的头部属性的拼接字符串
   */
  canonicalizedLOGHeaders : function(headers) {
    let str = '';
    let first = true;
    let keys = Object.keys(headers).sort();
    keys.forEach(function(key) {
      key = key.toLowerCase();
      if (key.indexOf('x-log-') === 0 || key.indexOf('a-acs-') === 0 ) {
        if (first) {
          first = false;
          str += `${ key }:${ headers[key] }`;
        } else {
          str += `\n${ key }:${ headers[key] }`;
        }
      }
    })
    return str;
  },

  /**
   * Get canonicalizedResource string as defined.
   * @param  {String} resource 要访问的LOG资源
   * @param  {Object} params   请求中的query
   * @return {String} resource CanonicalizedResource
   */
  canonicalizedResource : function( resource, params ) {
    if (!_.isEmpty(params)) {
      let keys = Object.keys(params).sort();
      let urlString = '';
      let first = true;
      keys.forEach(function(key) {
        if (first) {
          first = false;
          urlString += `${ key }=${ params[key] }`;
        } else {
          urlString += `&${ key }=${ params[key] }`;
        }
      })
      return `${ resource }?${ urlString }`;
    }
    return resource;
  },
  
  /**
   * Get request authorization string as defined.
   * @param  {String} method   Request Method eg: 'POST','GET'
   * @param  {String} resource 
   * @param  {String} key      
   * @param  {String} stsToken 
   * @param  {Object} params   
   * @param  {Object} headers  
   * @return {String}          
   */
  getRequestAuthorization : function(method, resource, key, stsToken, params, headers) {
    if (!key) {
      return '';
    }
    let content = `${ method }\n`;
    if (headers['Content-MD5'] !== undefined) {
      content += `${headers['Content-MD5']}`;
    }
    content += `\n`;
    if (headers['Content-Type'] !== undefined) {
      content += `${ headers['Content-Type'] }`;
    }
    content += `\n`;
    content += `${ headers['Date'] }\n`;
    content += `${ this.canonicalizedLOGHeaders(headers) }\n`;
    content += `${ this.canonicalizedResource(resource, params) }`;

    return this.hmacSHA1(content, key);
  },

  /**
   * 获取本地IP
   * @return {String} IP address
   */
  getLocalIp : function() {
    return ip.address();
  },

  /**
   * 检查是否是IP地址
   * @param  {String}  $gonten [description]
   * @return {Boolean}         [description]
   */
  isIp : function( str ){
    ip = str.split('.');
    for ( let i = 0; i < ip.length; i++ ) {
      if ( ip[i] > 255 ) {
        return false;
      }
    }
    return /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(str);
  },

  /**
   * deflate压缩
   * @param  {Buffer}   pb 待压缩内容
   * @param  {Function} fn 回调函数
   */
  deflate : function(pb, fn){
    zlib.deflate(pb, function(err, buf) {
      fn(err, buf);
    });
  },

  /**
   * 获取GMT格式时间
   * @return {String}  
   */
  getGMT : function() {
    return new Date().toUTCString();
  }

}