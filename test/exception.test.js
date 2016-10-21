'use strict';

let chai = require('chai'),
    assert = chai.assert,
    Exception = require('../Exception');

describe('Aliyun_Log_Exception', function () {

  it('return Aliyun_Log_Exception', function () {
    assert.throws(function() {
      let err = new Exception();
      throw err;
    }, Error);
  });

  it('to String', function() {
    let err = new Exception('RequestError', 'Connect failed', '10000');
    assert.equal(err.toString(), `Aliyun_Log_Exception: \n{\n    ErrorCode: RequestError,\n    ErrorMessage: Connect failed\n    RequestId: 10000\n}\n`);
  });

  it('Get Error Code', function () {
    let err = new Exception('RequestError', 'Connect failed', '10000');
    assert.equal(err.getErrorCode(), 'RequestError')
  });

  it('Get Error Message', function () {
    let err = new Exception('RequestError', 'Connect failed', '10000');
    assert.equal(err.getErrorMessage(), 'Connect failed')
  });

  it('Get Error RequestId', function () {
    let err = new Exception('RequestError', 'Connect failed', '10000');
    assert.equal(err.getRequestId(), '10000')
  });

})