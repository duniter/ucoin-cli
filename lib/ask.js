var inquirer = require('inquirer');

module.exports = {

  select: function (question, values, defaultValue, done) {
    if (values.length > 0) {
      inquirer.prompt([{
        type: "checkbox",
        name: "values",
        message: question,
        choices: values,
        default: defaultValue || values[0]
      }], function (answers) {
        done(null, answers.values);
      });
    } else {
      done('No data to choose in. Aborted.');
    }
  },

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

  password: function (question, done) {
    if (arguments.length == 1) {
      done = question;
      question = 'Password';
    }
    inquirer.prompt([{
      type: "password",
      name: "q",
      message: question
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