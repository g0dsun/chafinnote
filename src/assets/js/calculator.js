(function () {
  var form = document.getElementById("calc");
  var err = document.getElementById("calc-error");
  var box = document.getElementById("calc-result");
  var won = new Intl.NumberFormat("ko-KR");
  var num = function (v) { return Number(String(v).replace(/[^\d.]/g, "")) || 0; };
  var fmt = function (n) { return won.format(Math.round(n)) + "원"; };

  ["price", "down"].forEach(function (name) {
    form.elements[name].addEventListener("input", function (e) {
      var n = num(e.target.value);
      e.target.value = n ? won.format(n) : "";
    });
  });

  function show(msg) {
    err.textContent = msg;
    err.hidden = !msg;
    box.hidden = !!msg;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var price = num(form.elements.price.value);
    var down = num(form.elements.down.value);
    var n = parseInt(form.elements.months.value, 10);
    var annual = parseFloat(form.elements.rate.value);
    var p = price - down;

    if (!(price > 0)) return show("차량 가격을 입력하세요.");
    if (down >= price) return show("선수금은 차량 가격보다 작아야 합니다.");
    if (!(n >= 1 && n <= 120)) return show("할부 기간은 1~120개월로 입력하세요.");
    if (!(annual >= 0)) return show("연이율은 0 이상으로 입력하세요.");

    var r = annual / 100 / 12;
    var monthly = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    var total = monthly * n;

    document.getElementById("r-principal").textContent = fmt(p);
    document.getElementById("r-monthly").textContent = fmt(monthly);
    document.getElementById("r-interest").textContent = fmt(total - p);
    document.getElementById("r-total").textContent = fmt(total);
    show("");
  });
})();
