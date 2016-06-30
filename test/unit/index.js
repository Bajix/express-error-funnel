var uniqueError = require('./fixtures/unique-index.json'),
  httpMocks = require('node-mocks-http'),
  middleware = require('../../index');

describe('MongoDB Errors', function() {
  it('Parses E11000 duplicate key errors', function() {

    var req = httpMocks.createRequest(),
      res = httpMocks.createResponse(),
      err = new Error(uniqueError.errmsg);

    err.name = 'MongoError';
    err.code = uniqueError.code;

    middleware(err, req, res);

    assert.propertyVal(res, 'statusCode', 409);

    var data = res._getData();

    assert.deepEqual(data, {
      "code" : 11000,
      "statusCode" : 409,
      "message" : "Duplicate document exists",
      "errors" : [
        {
          "param" : "email",
          "msg" : "email already exists",
          "value" : "foo@bar.com"
        }
      ]
    });
  });
});