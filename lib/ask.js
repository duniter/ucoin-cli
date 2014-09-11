var inquirer = require('inquirer');

module.exports = {

  pick: function (question, values, defaultValue, done) {
    inquirer.prompt([{
      "type": "list",
      "name": "q",
      "message": question,
      "default": defaultValue,
      "choices": values
    }], function (answer) {
      done(null, answer.q);
    });
  },

  choose: function (question, defaultValue, ifOK, ifNotOK) {
    inquirer.prompt([{
      type: "confirm",
      name: "q",
      message: question,
      default: defaultValue,
    }], function (answer) {
      answer.q ? ifOK() : ifNotOK();
    });
  },

  simpleValue: function (question, defaultValue, validation, done) {
    if (arguments.length == 3) {
      done = validation;
      validation = undefined;
    }
    if (arguments.length == 2) {
      done = defaultValue;
      defaultValue = undefined;
      validation = undefined;
    }
    inquirer.prompt([{
      type: "input",
      name: "q",
      message: question,
      default: defaultValue,
      validate: validation
    }], function (answers) {
      done(null, answers.q);
    });
  },

  password: function (done) {
    inquirer.prompt([{
      type: "password",
      name: "q",
      message: "Password"
    }], function (answers) {
      done(null, answers.q);
    });
  },

  simpleInteger: function (question, done) {
    simpleValue(question, function (input) {
      return input && input.toString().match(/^[0-9]+$/) ? true : false;
    }, done);
  },

  simpleFloat: function (question, done) {
    simpleValue(question, function (input) {
      return input && input.toString().match(/^[0-9]+(\.[0-9]+)?$/) ? true : false;
    }, done);
  }
}