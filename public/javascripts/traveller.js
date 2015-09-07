(function () {
  'use strict';
  var iPoint,
    x,
    y,
    board = document.getElementById('board'),
    boardContext = board.getContext('2d'),
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
    players = [],
    waitingPlayers = [],
    ways = [],
    startBtn = document.getElementById('btn-start'),
    waitBtn = document.getElementById('btn-wait'),
    handlerTimeout;

  function relMouseCoords(event){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return {x:canvasX, y:canvasY}
  }
  HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;
  
  boardContext.drawPoint = function (point, width) {
    var offset = Math.ceil((width - 1) / 2);
    this.fillRect(point.x - offset, point.y - offset, width, width);
  };
  
  boardContext.fillStyle = '#000000';
  boardContext.drawPoint(startPoint, 5);
  
  function onWaitClick(event) {
    socket.emit('player', document.getElementById('player').value);
    document.getElementById('btn-start').style.visibility = 'visible';
  }
  
  function onPlayerInput(event) {
    if (event.target.value !== '') {
      waitBtn.style.visibility = 'visible';
    }
  }
  
  document.getElementById('player').addEventListener('input', onPlayerInput, false);
  
  
  waitBtn.addEventListener('click', onWaitClick, false);

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

  function viewUpdatePlayers() {
    document.getElementById('players').innerHTML = players.join(', ');
  }
  
  function acceptPlayer(player) {
    var myName = document.getElementById('player').value;
    if (-1 === players.indexOf(player)) {
      players.push(player);
      viewUpdatePlayers();
      if (('' !== myName) && (-1 !== players.indexOf(myName))) {
        socket.emit('player', myName);
      }
    }
    if (myName === player) {
      socket.on('start', onSocketStart);
    }
  }
  
  function refusePlayer(player) {
    if ((-1 === players.indexOf(player)) && (-1 === waitingPlayers.indexOf(player))){
      waitingPlayers.push(player);
      socket.emit('please_wait', player);
    }
  }
  
  function onPleaseWait(player) {
    if (player === document.getElementById('player').value) {
      document.getElementById('please_wait').style.display = 'block';
    }
  }
  
  function onSocketStart(sentPoints) {
    startBtn.removeEventListener('click', onStartClick);
    startBtn.className += ' disabled';
    socket.removeListener('start', onSocketStart);
    socket.removeListener('player', acceptPlayer);
    socket.removeListener('please_wait', onPleaseWait);
    socket.on('player', refusePlayer);
    ways = [];
    way = [startPoint];
    distance = 0;
    boardContext.beginPath();
    boardContext.clearRect(0, 0, boardWidth, boardHeight);
    boardContext.drawPoint(startPoint, 5);
    points = sentPoints;
    points.forEach(function (point) {
      boardContext.drawPoint(point, 3);
    });
    console.log(points);
    boardContext.moveTo(startPoint.x, startPoint.y);
    document.getElementById('please_wait').style.display = 'none';
    document.getElementById('run').style.display = 'inline';
    document.getElementById('run').style.visibility = 'visible';
    document.getElementById('result').style.visibility = 'hidden';
    document.getElementById('distance').innerHTML = '0';
    document.getElementById('time').innerHTML = '0';
    startTime = new Date().getTime();
  }
  
  function viewAddPoint(point) {
    boardContext.lineTo(point.x, point.y);
    boardContext.stroke();
    document.getElementById('distance').innerHTML = distance;
    document.getElementById('time').innerHTML = duration;
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
                  {player: document.getElementById('player').value,
                   way: way,
                   distance: distance,
                   duration: duration
                  });
    }
  }
  
  board.addEventListener('click', function (event) {
    var coords = board.relMouseCoords(event),
      x = coords.x,
      y = coords.y,
      iPoint,
      point;
    console.log(coords);
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
  
  function drawResult(player, way) {
    var iPoint, point, context = document.getElementById(player).getContext('2d');
    context.fillStyle = '#000000';
    context.beginPath();
    context.moveTo(scale(way[0].x), scale(way[0].y));
    for (iPoint = 0; iPoint < way.length; iPoint += 1) {
      point = scaleXY(way[iPoint]);
      context.lineTo(point.x, point.y);
    }
    context.stroke();
  }
  
  function again() {
    clearTimeout(handlerTimeout);
    socket.on('start', onSocketStart);
    socket.on('player', acceptPlayer);
    startBtn.addEventListener('click', onStartClick, false);
    startBtn.className = '';
    players = players.concat(waitingPlayers);
    viewUpdatePlayers();
  }
  
  function terminate() {
    var iPlayer = 0, player;
    while (iPlayer < players.length) {
      player = players[iPlayer];
      if (0 === ways.filter(
          function (way) {return player === way.player; }
        ).length) {
        players.splice(iPlayer, 1);
      } else {
        iPlayer += 1;
      }
    }
    viewUpdatePlayers();
    if (-1 === players.indexOf(document.getElementById('player').value)) {
      startBtn.style.visibility = 'hidden';
      points = [];
    } else {
      again();
    }
  }
  
  socket.on('way', function (sentWay) {
    var iWay, way, iPoint, point, context, playerIndex;
    if (0 === ways.length) {
      handlerTimeout = setTimeout(terminate, sentWay.duration);
    }
    ways.push(sentWay);
    ways.sort(compareWays);

    document.getElementById('ways-table').innerHTML =
      ways.reduce(function (acc, way, index) {
        return acc + '<tr><td>' + (index + 1).toString() +
          '</td><td>' + way.player +
          '</td><td>' + way.distance +
          '</td><td>' + way.duration + ' ms ' +
          '</td><td><canvas id=\'' + way.player +
          '\' class=\'board\' width=\'100\' height=\'75\'></canvas></td></tr>';
      }, '');
    for (iWay = 0; iWay < ways.length; iWay += 1) {
      way = ways[iWay];
      drawResult(way.player, way.way);
    }
    document.getElementById('result').style.visibility = 'visible';
    if (sentWay.player === document.getElementById('player').value) {
      document.getElementById('run').style.display = 'none';
    }
    if (ways.length === players.length) {
      again();
    }
  });
  
  
  startBtn.addEventListener('click', onStartClick, false);
  socket.on('player', acceptPlayer);
  socket.on('please_wait', onPleaseWait);
  if ('' === document.getElementById('player').value) {
    waitBtn.style.visibility = 'hidden';
  }
  startBtn.style.visibility = 'hidden';
  document.getElementById('run').style.visibility = 'hidden';
  document.getElementById('result').style.visibility = 'hidden';
  document.getElementById('please_wait').style.display = 'none';

}());
