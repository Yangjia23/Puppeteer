$(function(){
  let iframeUrl = $("#iframe", parent.document).attr('src')
  console.log(iframeUrl)

  $("#iframe", parent.document).onhashchange = function(sdd) {
    console.log(sdd)
  }

  window.onhashchange = function(){
    let hash = window.location.hash.replace(/#/, '')
    if (hash) {
      let prevActive = $('.nested-code > .active')
      if (prevActive) {
        prevActive.removeClass('active')
      }
      $(`#${hash}`).addClass('active')
    }
  }
});