var handler = require('node-restify-errors'),
  util = require('util');

module.exports = function ( err, req, res, next ) {
  var errors = [];

  if (err.errors && typeof err.errors === 'object') {
    if (Array.isArray(err.errors)) {
      errors = err.errors;
    } else {
      errors = Object.keys(err.errors).map(function( key ) {
        var data = err.errors[key];

        var error = {
          param: key,
          msg: data.message
        };

        if (data.hasOwnProperty('value')) {
          error.value = data.value;
        }

        return error;
      });
    }
  }

  if (err instanceof Array) {
    errors.push.apply(errors, err);
    err = new handler.BadRequestError('Invalid request parameters');
    err.errors = errors
  }

  if (err.name === 'ValidationError') {
    err = new handler.InvalidContentError('Schema validation failed');
    err.errors = errors
  }

  if (err.name === 'MongoError' && err.code === 11000) {

    var values = err.message.match(/\"([^\"]+)\"/),
      value = values && values[values.length - 1],
      paths = err.message.match(/index:\s([^\s]+)/),
      path = paths && paths[paths.length - 1];

    if (path && value) {
      path = path.match(/([a-zA-Z]+)_\d$/)[1];
      err = new handler.ConflictError('Duplicate document exists');
      err.code = 11000;
      err.errors = [{
        param: path,
        msg: path + ' already exists',
        value: value
      }];
    }
  }

  if (err.name === 'MongoError' && err.code === 10002200) {
    err = new handler.ConflictError('Duplicate document exists');
    err.errors = [{
      param: '_id',
      msg: 'Duplicate source ID has been found'
    }];
  }

  if (err.status) {
    res.statusCode = err.status;
  }

  if (res.statusCode < 400) {
    res.statusCode = err.statusCode || 500;
  }

  res.setHeader('Content-Type', 'application/json');

  var statusCode = err.statusCode || res.statusCode,
    code = err.code || err.name || statusCode,
    message = err.message || 'Unknown error';

  var error = {
    code: code,
    statusCode: statusCode,
    message: message
  };

  if (err.body) {
    util._extend(error, err.body);
  }

  if (err.errors) {
    error.errors = err.errors;
  }

  if (error.message === 'Unknown error' && error.code) {
    error.message = error.code;
  }

  res.send(error);
};