(function () {
  'use strict';
  var iPoint,
    x,
    y,
    board = document.getElementById("board"),
    boardContext = board.getContext("2d"),
    boardLeft = board.offsetLeft,
    boardTop = board.offsetTop,
    boardWidth = board.width,
    boardHeight = board.height,
    startPoint = {x : boardWidth / 2, y : boardHeight / 2},
    points = [],
    way = [startPoint],
    distance = 0,
    startTime,
    duration,
    socket = io(),
    ways = [],
    startBtn = document.getElementById('start');

  boardContext.fillStyle = "#000000";
  boardContext.fillRect(399, 299, 3, 3);

  function onStartClick(event) {
    var points = [],
      iPoint;
    for (iPoint = 0; iPoint < 10; iPoint = iPoint + 1) {
      x = Math.floor(Math.random() * board.width);
      y = Math.floor(Math.random() * board.height);
      points.push({x : x, y : y});
    }
    socket.emit('start', points);
  }

  boardContext.drawPoint = function (point) {
    this.fillRect(point.x - 1, point.y - 1, 3, 3);
  };
  
  function onSocketStart(sentPoints) {
    startBtn.removeEventListener('click', onStartClick);
    startBtn.className += " disabled";
    socket.removeListener('start', onSocketStart);
    ways = [];
    way = [startPoint];
    distance = 0;
    boardContext.beginPath();
    boardContext.clearRect(0, 0, boardWidth, boardHeight);
    boardContext.fillRect(startPoint.x - 2, startPoint.y - 2, 5, 5);
    points = sentPoints;
    points.forEach(function (point) {
      boardContext.fillRect(point.x - 1, point.y - 1, 3, 3);
    });
    boardContext.moveTo(startPoint.x, startPoint.y);
    startTime = new Date().getTime();
  }
  
  function viewAddPoint(point) {
    boardContext.lineTo(point.x, point.y);
    boardContext.stroke();
    document.getElementById("distance").innerHTML = distance;
    document.getElementById("time").innerHTML = duration;
  }

  function addPoint(point) {
    var lastPoint = way[way.length - 1],
      dx = point.x - lastPoint.x,
      dy = point.y - lastPoint.y,
      squareDist = dx * dx + dy * dy;
    way.push(point);
    distance += Math.sqrt(squareDist);
    duration = new Date().getTime() - startTime;
    viewAddPoint(point);
    if (0 === points.length) {
      socket.emit('way',
                  {player: document.getElementById("player").value,
                   way: way,
                   distance: distance,
                   duration: duration
                  });
      socket.on('start', onSocketStart);
      startBtn.addEventListener('click', onStartClick, false);
      startBtn.className = "";
    }
  }
  
  board.addEventListener('click', function (event) {
    var x = event.pageX - boardLeft,
      y = event.pageY - boardTop,
      iPoint,
      point;
    for (iPoint = 0; iPoint < points.length; iPoint = iPoint + 1) {
      point = points[iPoint];
      if (y > point.y - 10 && y < point.y + 10 &&
          x > point.x - 10 && x < point.x + 10) {
        points.splice(iPoint, 1);
        addPoint(point);
        break;
      }
    }
  }, false);

  startBtn.addEventListener('click', onStartClick, false);


  socket.on('start', onSocketStart);

  function compareWays(a, b) {
    var dd = a.distance - b.distance;
    if (0 !== dd) {
      return dd;
    } else {
      return a.duration - b.duration;
    }
  }

  function scale(x) {
    return Math.round(x * 0.125);
  }
  
  function scaleXY(point2d) {
    return {x: scale(point2d.x), y: scale(point2d.y)};
  }
  
  socket.on('way', function (sentWay) {
    var iWay, way, iPoint, point, context;
    ways.push(sentWay);
    ways.sort(compareWays);
    document.getElementById('ways').innerHTML =
      ways.reduce(function (acc, way) {
        return acc + "<li>" + way.player +
          " d = " + way.distance +
          " t = " + way.duration + " ms " +
          "<canvas id=\"" + way.player +
          "\" class=\"board\" width=\"100\" height=\"75\"></canvas></li>";
      }, "");
    for (iWay = 0; iWay < ways.length; iWay += 1) {
      way = ways[iWay];
      context = document.getElementById(way.player).getContext("2d");
      context.fillStyle = "#000000";
      context.beginPath();
      context.moveTo(scale(way.way[0].x), scale(way.way[0].y));
      for (iPoint = 0; iPoint < way.way.length; iPoint += 1) {
        point = scaleXY(way.way[iPoint]);
        context.lineTo(point.x, point.y);
      }
      context.stroke();
    }
  });

}());
