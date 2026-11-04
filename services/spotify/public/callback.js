if(window.opener){window.opener.postMessage({type:'spotify-connected'},location.origin);window.close();}else location.replace('/spotify');
