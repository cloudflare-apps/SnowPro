(function(){
  if (!window.addEventListener || document.documentElement.style.pointerEvents === undefined || !window.requestAnimationFrame)
    return;

  var FLAKES, wind, options, shown, windAngle, windStrength, prevStart, firstPass;

  var IS_PREVIEW = INSTALL_ID === 'preview';

  function updateFlakes() {
    if (options)
      FLAKES = Math.ceil((+options.density) * (1000 / W));
  }

  function setOptions(opts) {
    options = opts;

    updateFlakes();

    windStrength = +options.wind;
    windAngle = 0;

    var prevShown = shown;

    shown = true
    if (options.hideBeforeToggle && options.hideBefore){
      if (!IS_PREVIEW && new Date(options.hideBefore) > new Date()){
        clear();

        shown = false;
      }
    }
    if (options.hideAfterToggle && options.hideAfter){
      if (!IS_PREVIEW && new Date(options.hideAfter) < new Date()){
        clear();

        shown = false;
      }
    }

    if (!prevShown && shown){
      show();
    }

    if (hideTimer)
      clearTimeout(hideTimer);
    if (options.hideAfterTime !== '-1'){
      hideTimer = setTimeout(hide, options.hideAfterTime * 1000);
    }

    if (options.startFrom !== prevStart)
      reset();
    prevStart = options.startFrom;
  }

  function rnd2() {
    return 0.5 + ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3;
  }

  function randAngle() {
    return rnd2() * (Math.PI / 4) + (Math.PI / 4) + (Math.PI / 8)
  }

  function hexToRGBA(hex, alpha) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return "rgba(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + "," + alpha + ")";
    }
  }

  function newParticle(atTop) {
    var point = {
      x: Math.random()*W,
      y: Math.random()*H,
      r: Math.random()*2+1,
      a: randAngle()
    };

    if (atTop){
      point.y = -point.r;
    } else {
      point.firstPass = true;
    }

    return point;
  }

  var W, H, fixedEls, fixedAccu, accumulation, hideTimer;
  function reset() {
    W = window.innerWidth;
    H = window.innerHeight;

    updateFlakes();

    canvas.width = W;
    canvas.height = H;

    accumCanvas.width = W;
    accumCanvas.height = H;

    particles = []
    accumulation = {};

    firstPass = true;

    ctx.clearRect(0, 0, W, H);
    accumCtx.clearRect(0, 0, W, H);

    updateFixed();
  }

  function createCanvas() {
    var canvas = document.createElement('canvas');
    canvas.className = 'eager-snow-canvas';

    return canvas;
  }

  var canvas = createCanvas();
  var ctx = canvas.getContext("2d");

  var accumCanvas = createCanvas();
  var accumCtx = accumCanvas.getContext("2d");

  var SHADOW = 5;

  var updateFixed = function() {
    fixedEls = [];
    fixedAccu = [];
    for (var j=0; j < document.body.children.length; j++){
      var node = document.body.children[j];
      var style = getComputedStyle(node);

      if (node.tagName != 'CANVAS' && style.position === 'fixed' && +style.opacity > 0.1 && style.display != 'none' && style.visibility == 'visible'){
        var rect = node.getBoundingClientRect();
        if (rect.top > 0){
          fixedEls.push(rect);
          fixedAccu.push({});
        }
      }
    }
  }

  reset();

  function hide(){
    canvas.style.opacity = 0;
    accumCanvas.style.opacity = 0;

    shown = false;
  }

  function show(){
    canvas.style.opacity = 1;
    accumCanvas.style.opacity = 1;

    shown = true;

    update();
  }

  function clear(){
    ctx.clearRect(0, 0, W, H);

    if (!options.accumulate){
      accumCtx.clearRect(0, 0, W, H);
      fixedAccu = [];
      accumulation = {};
      return;
    }

    for (var i = 0; i < particles.length; i++){
      if (options.startFrom === 'top' && particles[i].firstPass)
        continue;

      var accuX = Math.floor(particles[i].x);
      var found = false;

      if (options.accumulateFixed){
        for (var j=0; j < fixedEls.length; j++){
          var pos = fixedEls[j];

          fixedAccu[j][accuX] |= 0;

          if (particles[i].x < (pos.left + pos.width) &&
              particles[i].x > (pos.left + 2 * particles[i].r) &&
              particles[i].y > pos.top - fixedAccu[j][accuX] &&
              particles[i].y < (pos.top - fixedAccu[j][accuX] + 10) &&
              particles[i].x - pos.left > fixedAccu[j][accuX] &&
              (pos.left + pos.width) - particles[i].x > fixedAccu[j][accuX]) {
            found = j;
          }
        }
      }

      var accum;
      if (found !== false){
        accum = fixedAccu[found];
      } else {
        accum = accumulation;
      }

      var offset = 0;
      for (var offset = 1; offset < 5; offset++){
        if (accuX > 0 && accum[accuX] - 2 > (accum[accuX - 1] || 0))
          accuX--;
        else if (accuX < innerHeight && accum[accuX] - 2 > (accum[accuX + 1] || 0))
          accuX++;
        else
          break;
      }

      if (!accum[accuX])
        accum[accuX] = 0;

      if (found !== false || (particles[i].y > innerHeight - accum[accuX] && accum[accuX] < 30)){
        var p = particles[i];

        accumCtx.fillStyle = hexToRGBA(options.color, 0.5);
        accumCtx.shadowColor = hexToRGBA(options.color, 0.5);

        accumCtx.shadowBlur = SHADOW;
        accumCtx.beginPath();
        accumCtx.moveTo(p.x, p.y);
        accumCtx.arc(accuX, p.y, p.r, 0, Math.PI*2, true);
        accumCtx.fill();

        accum[accuX] += 1;

        particles[i] = newParticle(true);
      }
    }
  }

  function draw(){
    ctx.fillStyle = hexToRGBA(options.color, 0.5);
    ctx.shadowColor = hexToRGBA(options.color, 0.5);
    ctx.shadowBlur = SHADOW;
    ctx.beginPath();

    for(var i = 0; i < FLAKES; i++){
      var p = particles[i];
      if (!p)
        continue;

      if (p.firstPass && options.startFrom === 'top')
        continue;

      if (p.x < 0)
        p.x = W;
      if (p.x > W)
        p.x = 0;

      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2, true);
    }

    ctx.fill();
  }

  setInterval(function(){
    if (Math.random() > 0.5)
      windAngle = 0
    else
      windAngle = Math.PI
  }, 1000);

  var lastFrame;
  var startupTime = +new Date;
  var slowFrameCount = 0;
  function update(){
    if ((new Date - startupTime) > 2000 && lastFrame){
      var frameTime = new Date - lastFrame;

      if (frameTime > 32){
        slowFrameCount++;
      } else {
        slowFrameCount = 0;
      }

      if (slowFrameCount > 5 && FLAKES > 8){
        FLAKES = Math.floor(FLAKES - FLAKES / 3);
      } else if (frameTime < 18 && FLAKES < +options.density){
        FLAKES += FLAKES / 2;
      }
    }

    lastFrame = +new Date;

    if (!shown)
      return;

    if (pause)
      return;

    clear()

    var drawnThisFrame = 0;

    for(var i = 0; i < FLAKES; i++){
      if (!particles[i]){
        if (drawnThisFrame > 10 && options.startFrom === 'everywhere-gradual')
          continue

        drawnThisFrame++

        particles.push(newParticle());
      }

      var p = particles[i];

      p.y += Math.sin(p.a);
      p.x += Math.cos(p.a);

      p.a += (windStrength * (windAngle - p.a)) / (100 * p.r)

      if (p.x > W + 5 || p.x < -5 || (p.y - p.r) > H){
        p.a = randAngle();
        p.x = Math.random() * W;
        p.y = -p.r;
        p.firstPass = false;
      }
    }

    draw();

    requestAnimationFrame(update);
  }

  var scrollHidden = false;
  var pause = false;
  var pauseTimeout;

  window.addEventListener('scroll', function(e){
    if (e.target === document){
      if (!pause)
        canvas.className = 'eager-snow-canvas eager-snow-scrolling';

      pause = true;

      if (pauseTimeout)
        clearTimeout(pauseTimeout);

      pauseTimeout = setTimeout(function(){
        pause = false;
        canvas.className = 'eager-snow-canvas';
        update();
      }, 100);

      if (document.body.scrollTop === 0 && !shown && scrollHidden){
        show();
        scrollHidden = false;
      } else if (document.body.scrollTop !== 0 && shown && options.hideOnScroll){
        hide();
        scrollHidden = true;
      }
    }
  });

  window.addEventListener('resize', reset);

  document.body.appendChild(canvas)
  document.body.appendChild(accumCanvas)
  accumCanvas.style.zIndex = (+getComputedStyle(canvas).zIndex) + 1;

  setOptions(INSTALL_OPTIONS);

  INSTALL_SCOPE = {
    setOptions: setOptions
  };
})();
