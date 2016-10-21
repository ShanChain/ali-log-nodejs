'use strict';
let util = require('util');

/**
 * Class Aliyun_Log_Exception description
 * @param {String} code      错误码
 * @param {String} message   异常描述
 * @param {String} requestId 请求ID
 */
function Aliyun_Log_Exception(code, message, requestId) {
  let error = Error.call(this, message);
  error.name = this.name = code;

  this.message = error.message;
  Object.defineProperty(this, 'stack', {
      get: function () {
          return error.stack;
      }
  })
  return this;
}

// util.inherits(Aliyun_Log_Exception, Error);
Object.setPrototypeOf(Aliyun_Log_Exception.prototype, Error.prototype);

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

module.exports = Aliyun_Log_Exception;