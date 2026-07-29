/* ═════════════════════════════════════════════
   天氣海象 + 突發事件系統
   每次 welcome-screen 顯示時重新抽選一次

   ⚠️ 跨檔案依賴注意（重要）：
   本檔案用到的 weatherDB / eventDB 定義在 db.js，HARBOR_INFO 定義在
   welcome-screen.js（見該檔案 window.HARBOR_INFO）。但 index.html 裡
   <script> 標籤的載入順序是：
       weather-event.js → welcome-screen.js → ... → db.js → main.js
   也就是本檔案「載入時」，這些變數其實都還不存在！
   之所以目前運作正常，是因為本檔案的函式都只在
   window.rollAndApplyWeather() 被「呼叫」的當下才去讀取這些變數
   （呼叫時機是玩家進到選港口畫面之後，那時候 db.js / welcome-screen.js
   早就載入完了）。rollAndApplyWeather() 內有針對 weatherDB/eventDB
   做 typeof 防呆，但 HARBOR_INFO 沒有，純粹是靠「呼叫時機夠晚」在保護，
   不是靠邏輯保護。
   → 請勿在頁面載入當下（script 執行的最外層）直接呼叫本檔案內的函式，
     一定要等使用者實際進入選港口流程後才會被觸發。
   → 若之後要調整 index.html 的 script 載入順序，務必連帶檢查這裡。
   ═════════════════════════════════════════════ */
(function(){

	var PORT_IDS = ['badouzi','nanfangao','longfeng','wuqi','anping','donggang'];

	/* 依 weight 加權隨機抽 1 筆 */
	function weightedPick(arr){
		var total = arr.reduce(function(s,o){ return s + o.weight; }, 0);
		var r = Math.random() * total;
		for(var i=0;i<arr.length;i++){
			r -= arr[i].weight;
			if(r <= 0) return arr[i];
		}
		return arr[arr.length-1];
	}

	/* 主運算：回傳 { weather, event, portStatus:{id:true/false}, closedByEvent:{id:eventName} } */
	function rollWeatherAndEvents(){
		var weather = weightedPick(weatherDB);

		/* 1. 依天氣機率，每港獨立丟骰 */
		var portStatus = {};
		PORT_IDS.forEach(function(id){
			var chance = (weather.ports && weather.ports[id] != null) ? weather.ports[id] : 100;
			portStatus[id] = (Math.random() * 100 < chance);
		});

		/* 2. 判定是否觸發事件 */
		var event = null;
		var closedByEvent = {};
		var triggered = Math.random() * 100 < (weather.eventChance || 0);
		if(triggered && typeof eventDB !== 'undefined' && eventDB.length){
			event = weightedPick(eventDB);
			/* 收集所有標 "pick" 的候選港口（無論天氣判定是否已關閉，pick 候選池都看事件表本身） */
			var candidates = PORT_IDS.filter(function(id){
				return event.ports && event.ports[id] === 'pick';
			});
			if(candidates.length){
				var chosen = candidates[Math.floor(Math.random() * candidates.length)];
				portStatus[chosen] = false;
				closedByEvent[chosen] = event.name;
			}
		}

		return { weather: weather, event: event, portStatus: portStatus, closedByEvent: closedByEvent };
	}

	/* 套用結果到 DOM */
	function applyWeatherToUI(result){
		window._wsWeatherResult = result;

		/* 天氣卡片：只顯示當天天氣名稱 */
		var wBox = document.getElementById('ws-weather-box');
		var wName = document.getElementById('ws-weather-name');
		if(wName) wName.textContent = result.weather.name;
		if(wBox) requestAnimationFrame(function(){ wBox.classList.add('show'); });

		/* 港口開放/關閉：只變暗，不疊加圖示 */
		var closedList = [];
		PORT_IDS.forEach(function(id){
			var el = document.getElementById('wsh-'+id);
			if(!el) return;
			var isOpen = result.portStatus[id];
			el.classList.toggle('ws-closed', !isOpen);
			if(!isOpen){
				var info = HARBOR_INFO[id] || {}; /* ← 依賴 welcome-screen.js 的 window.HARBOR_INFO，見檔頭警語 */
				var reason = result.closedByEvent[id] || result.weather.name;
				closedList.push((info.shortName || info.name || id) + '（' + reason + '）');
			}
		});

		/* 右下角面板提示：開場時列出所有封港原因
		   （玩家點選任一漁港後，此提示會被面板內容取代，消失即可，無需另外處理） */
		var hint = document.getElementById('ws-panel-hint');
		if(hint){
			if(closedList.length){
				hint.innerHTML = '⚓ 今日封港：<br>' + closedList.join('<br>');
			} else {
				hint.innerHTML = '👆 點選地圖上<br>的漁港出發';
			}
		}

		/* 若先前選的港口這次被關閉，清除選擇並提示 */
		if(window.selectedLocationId && result.portStatus[window.selectedLocationId] === false){
			window.selectedLocationId = null;
			sessionStorage.removeItem('selectedLocationId');
			document.querySelectorAll('.ws-harbor').forEach(function(el){ el.classList.remove('ws-selected'); });
			var content = document.getElementById('ws-panel-content');
			if(hint) hint.style.display = 'block';
			if(content) content.style.display = 'none';
			wsShowToast('⚠️ 原出發漁港今日封港，請重新選擇');
		}
	}

	window.rollAndApplyWeather = function(){
		if(typeof weatherDB === 'undefined' || typeof eventDB === 'undefined'){
			return; /* db.js 尚未載入或不存在，略過 */
		}
		var result = rollWeatherAndEvents();
		applyWeatherToUI(result);
	};

})();
