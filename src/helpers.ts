Handlebars.registerHelper("isEven", function (index) {
  return (index % 2) === 0;
});

Handlebars.registerHelper("isOdd", function (index) {
  return (index % 2) === 1;
});

Handlebars.registerHelper("and", function (a, b) {
  return !!a && !!b;
});

Handlebars.registerHelper("or", function (a, b) {
  return !!a || !!b;
});

Handlebars.registerHelper("not", function (val) {
  return !val;
})