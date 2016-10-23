'use strict';
let util = require('util');

/**
 * Class Aliyun_Log_Exception description
 * @param {String} code      错误码
 * @param {String} message   异常描述
 * @param {String} requestId 请求ID
 */
function Aliyun_Log_Exception (code, message, requestId) {
  let error = Error.call(this);
  error.name = this.name = code || 'Error';
  if (code) this.code = error.code = code;
  if (message) this.message = error.message = message;
  if (requestId) this.requestId = error.requestId = requestId;
  Object.defineProperty(this, 'stack', {
    get: function () {
      return error.stack;
    }
  })
  return this;
}

util.inherits(Aliyun_Log_Exception, Error);

/**
 * The toString() method allows a class to decide how it will react when it is treated like a string.
 * @return {String} error 
 */
Aliyun_Log_Exception.prototype.toString = function() {
  return `Aliyun_Log_Exception: \n{\n    ErrorCode: ${this.code},\n    ErrorMessage: ${this.message}\n    RequestId: ${this.requestId}\n}\n`;
}

/**
 * Get Aliyun_Log_Exception error code.
 * @return {String|Number} Error code
 */
Aliyun_Log_Exception.prototype.getErrorCode = function() {
  return this.code;
}

/**
 * Get Aliyun_Log_Exception error message.
 * @return {String} Error message
 */
Aliyun_Log_Exception.prototype.getErrorMessage = function() {
  return this.message;
}

/**
 * Get log service sever requestid, '' is set if client or Http error.
 * @return {String} requestId
 */
Aliyun_Log_Exception.prototype.getRequestId = function() {
  return this.requestId;
}

/**
 * ParameterInvalid Exception
 * @param {String} Error message 
 */
Aliyun_Log_Exception.ParameterInvalid = function(message) {
  return new this('ParameterInvalid', message);
}


/**
 * ParameterInvalid Exception
 * @param {String} Error message 
 */
Aliyun_Log_Exception.ParameterProjectInvalid = function() {
  return new this('ParameterInvalid', '缺少参数project');
}


/**
 * InvalidLogSize Exception
 * @param {String} Error message 
 */
Aliyun_Log_Exception.InvalidLogSize = function(message) {
  return new this('InvalidLogSize', message);
}

module.exports = Aliyun_Log_Exception;