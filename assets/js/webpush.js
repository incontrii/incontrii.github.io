var PushApp = {
    isSubscribed: false,
    applicationServerPublicKey: 'BJgGJrbVJ8DU7zAcNOK8urr81q_TKRiMqFodOaBbn3IlZHcWjuAc0jYHS_h5PfOPfXLGwt1doVJuvHRSfKyUZQE',
    initializePushUI: function() {
        PushApp.isPrivateMode().then(function (isPrivate) {
    
            if (isPrivate === true)
                return;

            swRegistration.pushManager.getSubscription()
            .then(subscription => {
            this.isSubscribed = (subscription !== null);
            //this.updateSubscriptionOnServer(subscription);
            if (this.isSubscribed) {
                // console.log('User IS subscribed.');
            } else {
                // console.log('User is NOT subscribed.');
            }
                
                var $cookiewpd = PushApp.getCookie("wpd"); 
                if (($cookiewpd && ($cookiewpd == 'true')) || (this.isSubscribed)) {
                    return;
                }
                // ask for permission on scroll to bottom
                if (js_webpush_method == 'scroll_prepopup') {
                    var inprompt = false;
                    $(window).scroll(function() {
                        if (($(window).scrollTop() + $(window).height() >= ( $(document).height() *js_webpush_method_setting/100 ) ) && (inprompt === false)) {
                            inprompt = true;
                            if (PushApp.isSubscribed === false ) {
                                // show pre-popup
                                PushApp.showPrePopup();
                            }
                        }
                    });
                }
                else if (js_webpush_method == 'time_prepopup') {
                    setTimeout(function(){ 
                        if (PushApp.isSubscribed === false ) {
                            // show pre-popup
                            PushApp.showPrePopup();
                        }
                    },parseInt(js_webpush_method_setting) * 1000);
                }
                else if (js_webpush_method == 'banner') {
                    $(".header-text-c").addClass('webpush-banner-enabled'); // show banner
                    $(".webpush-banner").show("fast", function() {
                        // Animation complete.
                    });

                    var msgr = Math.floor(Math.random() * 4);
                    $(".webpush-banner-text").html(PushApp.replaceHostname(js_webpush_messages[msgr].t) + "<br/>" + PushApp.replaceHostname(js_webpush_messages[msgr].s));
                    $(".webpush-banner-button-agree").text(js_webpush_messages[msgr].a);
                    PushApp.sendUserUpdateEvent(js_webpush_method, 'prompt_show', msgr+1);

                    setTimeout(function(){
                        
                        $(".webpush-banner-button-agree").on('click', function() {
                            PushApp.sendUserUpdateEvent(js_webpush_method, 'prompt_allow');
                            PushApp.subscribeUser();
                        });
                        $(".webpush-banner-button-close").on('click', function() {
                            $(".webpush-banner").remove();
                            $(".webpush-banner-enabled").removeClass('webpush-banner-enabled');
                            PushApp.setCookie("wpd", "true", 1);
                            PushApp.sendUserUpdateEvent(js_webpush_method, 'prompt_dismiss');
                            
                        });
                        
                    }, 500);
                }
            });

        });
    },
    showPrePopup: function() {
        var msgr = Math.floor(Math.random() * 4);
        $(".webpush-modal-title").text(this.replaceHostname(js_webpush_messages[msgr].t));
        $(".webpush-modal-subtitle").text(this.replaceHostname(js_webpush_messages[msgr].s));
        $(".webpush-modal-button-dismiss").text(js_webpush_messages[msgr].d);
        $(".webpush-modal-button-allow").text(js_webpush_messages[msgr].a);

        $(".webpush-modal-button-dismiss").on('click', function() {
            $('#pushModal').modal('hide');
            PushApp.setCookie("wpd", "true", 1);
            PushApp.sendUserUpdateEvent(js_webpush_method, 'prompt_dismiss');
        });
        $(".webpush-modal-button-allow").on('click', function() {
            $('#pushModal').modal('hide');
            PushApp.sendUserUpdateEvent(js_webpush_method, 'prompt_allow');
            PushApp.subscribeUser();
        });
        $('#pushModal').modal('show');
        PushApp.sendUserUpdateEvent(js_webpush_method, 'prompt_show', msgr+1);
    },
    sendUserUpdateEvent: function(prompt_type, prompt_event, message_id) {
        $.ajax({ 
            url: '/api/webpushupdateuser',
            type: 'POST',
            cache: false, 
            data: { uid: js_uid, prompt_type: prompt_type, prompt_event: prompt_event, message_id: message_id }, 
            success: function(data){
                //alert('Success!')
            }
            , error: function(jqXHR, textStatus, err){
                //alert('text status '+textStatus+', err '+err)
            }
        });  
    },
    replaceHostname: function(text) {
        return text.replace(/{hostname}/g, js_webpush_hostname);
    },
    updateSubscriptionOnServer: function(subscription) {
        
        $.ajax({ 
            url: '/saveWebpushSubsription',
            type: 'POST',
            cache: false, 
            data: { d: JSON.stringify(subscription) }, 
            success: function(data){
                //alert('Success!')
            }
            , error: function(jqXHR, textStatus, err){
                //alert('text status '+textStatus+', err '+err)
            }
        });
    },
    subscribeUser: function() {
        const applicationServerKey = this.urlB64ToUint8Array(this.applicationServerPublicKey);
        swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        })
        .then(subscription => {
            // console.log('User is subscribed:', subscription);
            this.updateSubscriptionOnServer(subscription);
            this.isSubscribed = true;

            if (js_webpush_method == 'banner') {
                $(".webpush-banner").remove();
                $(".webpush-banner-enabled").removeClass('webpush-banner-enabled');
            }
        })
        .catch(err => {
            if (Notification.permission === 'denied') {
                console.warn('Permission for notifications was denied');
            } else {
                console.error('Failed to subscribe the user: ', err);
            }
        });
    },
    urlB64ToUint8Array: function(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');
    
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
    
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },
    setCookie: function(name,value,days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    },
    getCookie: function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    },
    isPrivateMode: function() {
        return new Promise(function detect(resolve) {
          var yes = function() { resolve(true); }; // is in private mode
          var not = function() { resolve(false); }; // not in private mode
      
          function detectChromeOpera() {
            // https://developers.google.com/web/updates/2017/08/estimating-available-storage-space
            var isChromeOpera = /(?=.*(opera|chrome)).*/i.test(navigator.userAgent) && navigator.storage && navigator.storage.estimate;
            if (isChromeOpera) {
              navigator.storage.estimate().then(function(data) {
                return data.quota < 120000000 ? yes() : not();
              });
            }
            return !!isChromeOpera;
          }
      
          function detectFirefox() {
            var isMozillaFirefox = 'MozAppearance' in document.documentElement.style;
            if (isMozillaFirefox) {
              if (indexedDB == null) yes();
              else {
                var db = indexedDB.open('inPrivate');
                db.onsuccess = not;
                db.onerror = yes;
              }
            }
            return isMozillaFirefox;
          }
      
          function detectSafari() {
            var isSafari = navigator.userAgent.match(/Version\/([0-9\._]+).*Safari/);
            if (isSafari) {
              var testLocalStorage = function() {
                try {
                  if (localStorage.length) not();
                  else {
                    localStorage.setItem('inPrivate', '0');
                    localStorage.removeItem('inPrivate');
                    not();
                  }
                } catch (_) {
                  // Safari only enables cookie in private mode
                  // if cookie is disabled, then all client side storage is disabled
                  // if all client side storage is disabled, then there is no point
                  // in using private mode
                  navigator.cookieEnabled ? yes() : not();
                }
                return true;
              };
      
              var version = parseInt(isSafari[1], 10);
              if (version < 11) return testLocalStorage();
              try {
                window.openDatabase(null, null, null, null);
                not();
              } catch (_) {
                yes();
              }
            }
            return !!isSafari;
          }
      
          function detectEdgeIE10() {
            var isEdgeIE10 = !window.indexedDB && (window.PointerEvent || window.MSPointerEvent);
            if (isEdgeIE10) yes();
            return !!isEdgeIE10;
          }
      
          // when a browser is detected, it runs tests for that browser
          // and skips pointless testing for other browsers.
          if (detectChromeOpera()) return;
          if (detectFirefox()) return;
          if (detectSafari()) return;
          if (detectEdgeIE10()) return;
          
          // default navigation mode
          return not();
        });
      }
}