$(function () {
  var bigPool = [
    {
      img: '/2012/assets/static.hdslb.com/ad-images/index/b2/2012-10-26-01.jpg',
      url: 'http://3-seed.taobao.com/'
    },
    {
      img: '/2012/assets/static.hdslb.com/ad-images/index/b2/2012-10-26-02.jpg',
      url: 'http://3-seed.taobao.com/'
    },
    {
      img: '/2012/assets/static.hdslb.com/ad-images/index/b2/2012-10-26-03.jpg',
      url: 'http://3-seed.taobao.com/'
    }
  ];
  var rightPool = [
    {
      img: '/2012/assets/static.hdslb.com/ad-images/index/c1/2012-07-24-01.jpg',
      url: 'http://manyanshe.taobao.com/'
    },
    {
      img: '/2012/assets/static.hdslb.com/ad-images/index/c1/2012-07-24-02.jpg',
      url: 'http://manyanshe.taobao.com/'
    },
    {
      img: '/2012/assets/static.hdslb.com/ad-images/index/c1/2012-07-24-03.jpg',
      url: 'http://manyanshe.taobao.com/'
    }
  ];

  function pick(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function fill(selector, pool, width, height) {
    var slot = $(selector);
    if (!slot.length || slot.children().length) return;
    var ad = pick(pool);
    slot.empty().append(
      '<a href="' + ad.url + '" target="_blank">' +
        '<img src="' + ad.img + '" width="' + width + '" height="' + height +
        '" border="0" alt="" />' +
      '</a>'
    );
  }

  function fillAll() {
    fill('.ad-b', bigPool, 700, 70);
    fill('.ad-b2', bigPool, 700, 70);
    fill('.ad-c', rightPool, 250, 80);
    fill('.ad-c2', rightPool, 250, 80);
    fill('.ad-c3', rightPool, 250, 80);
    fill('.ad-c4', rightPool, 250, 80);
    fill('.ad-e1', bigPool, 960, 96);
    fill('.ad-e2', bigPool, 960, 96);
  }

  fillAll();
  setTimeout(fillAll, 1000);

  $('<div class="mobile"><a href="/html/ios.html" target="_blank" class="mios"></a><a href="/html/android.html" target="_blank" class="m_android"></a></div>').prependTo('#rbox');
});
