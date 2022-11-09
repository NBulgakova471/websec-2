const requestURL = 'http://localhost:5000';
let stopsArray = [];
let favoriteStops = [];
let stopMarkers = [];
let stops = [];
let trail = '';

function sendRequest(method, url, body = null){
	if(body !== null){
		return fetch(url, {
			method: method,
			body: JSON.stringify(body)
		})
	}
    return fetch(url).then(response => {
        if (response.ok){
            return response.json();
        }
    })
}

function initMap(){
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 53.2134322963903, lng: 50.17992816919969},
        zoom: 16,
        mapId: '49a29c004abdc2f9'
    });

    const params = {
        value: 'initMap'
    }
    let url = requestURL + '?' + ( new URLSearchParams( params ) ).toString();

    sendRequest('GET', url)
        .then(parseData)
        .then(initStops)
        .then(createFavoriteStops)
        .then(searchStop)
        .catch(err => console.log(err))
}

function parseData(data){
    favoriteStops = data['favoriteStops'];
    let stops = JSON.parse(data['stops']);
    let stopsArr = stops["stops"]["stop"];
    for(let i = 0; i < stopsArr.length; ++i){
        let stopObj = {};
        stopObj.title = stopsArr[i]["title"]["_text"];
        stopObj.ks_id = stopsArr[i]["KS_ID"]["_text"];
        stopObj.adjacentStreet = stopsArr[i]["adjacentStreet"]["_text"];
        stopObj.direction = stopsArr[i]["direction"]["_text"];
        stopObj.busesMunicipal = stopsArr[i]["busesMunicipal"]["_text"];
        stopObj.busesCommercial = stopsArr[i]["busesCommercial"]["_text"];
        stopObj.busesPrigorod = stopsArr[i]["busesPrigorod"]["_text"];
        stopObj.busesSeason = stopsArr[i]["busesSeason"]["_text"];
        stopObj.busesSpecial = stopsArr[i]["busesSpecial"]["_text"];
        stopObj.busesIntercity = stopsArr[i]["busesIntercity"]["_text"];
        stopObj.trams = stopsArr[i]["trams"]["_text"];
        stopObj.trolleybuses = stopsArr[i]["trolleybuses"]["_text"];
        stopObj.latitude = Number(stopsArr[i]["latitude"]["_text"]);
        stopObj.longitude = Number(stopsArr[i]["longitude"]["_text"]);
        stopsArray.push(stopObj)
    }
}

function createFavoriteStops(stop){
    if(stop) createListStops(stop, true);
    else createListStops(favoriteStops, true);
}

function translate(transportType){
    if(transportType === 'busesMunicipal') return 'Муниципальный автобус';
    if(transportType === 'busesCommercial') return 'Коммерческий автобус';
    if(transportType === 'busesPrigorod') return 'Пригородный автобус';
    if(transportType === 'busesSeason') return 'Сезонный автобус';
    if(transportType === 'busesSpecial') return 'Специальный автобус';
    if(transportType === 'busesIntercity') return 'Междугородний автобус';
    if(transportType === 'trams') return 'Трамвай';
    if(transportType === 'trolleybuses') return 'Троллейбус';
    if(transportType === 'metros') return 'Метро';
}

function createUElements(stop, transportType){
    let type = translate(transportType);
    let routes = stop[transportType].split(', ');
    let div = document.createElement("div");
    div.classList.add('routes-containter');
    div.style.fontSize = "1.5em";
    div.style.fontWeight = "bold";
    div.style.marginTop = "0.83em";
    div.innerHTML = `${type}: `;
    routes.forEach(route =>{
        let u = document.createElement("u");
        u.style.cursor = "pointer";
        u.innerHTML = `${route}`;
        u.addEventListener('click', () => {
            initRoute(stop, route, transportType);
        });
        div.appendChild(u);
    });
    return div;
}

function initRoute(stop, route, transportType){
    const params = {
        value: 'initRoute',
        ks_id: stop.ks_id,
        direction: stop.direction,
        routeNumber: route,
        transportType: transportType
    }
    let url = requestURL + '?' + (new URLSearchParams(params)).toString();
    sendRequest('GET', url)
        .then(showRoute)
        .catch(err => console.log(err))
} 

function showRoute(route){
    trail = route;
    stopMarkers.forEach(stop => {
        stop.setVisible(false);
    });
    let stops = [];
    stopsArray.forEach(stop => {
        let flag = route.ksIds.includes(stop.ks_id);
        if(flag){
            stopMarkers.forEach(marker =>{
                let lat = marker.getPosition().lat();
                let lng = marker.getPosition().lng();
                if(lat === stop.latitude && lng === stop.longitude) 
                    marker.setVisible(true);
            });
            stops.push(stop);
        } 
    });
    createListStops(stops, false);
}

function createStop(stopObj){
    let content = document.createElement("div");
    let div = document.createElement("div");
    content.appendChild(div);

    for(let property in stopObj){
        if (property === "latitude" || property === "longitude" || property === "ks_id") continue;
        if(stopObj[property] !== undefined){
            if(property === "direction") continue;
            if(property === "adjacentStreet") {
                div.innerHTML += `<h2>Остановка ${stopObj["adjacentStreet"]}, ${stopObj["direction"]}</h2>`;
                continue;
            }
            if(property === "title") div.innerHTML += `<h2>${stopObj[property]}</h2>`;
            else{
                let divUs = createUElements(stopObj, property);
                div.appendChild(divUs);
            }
        }
    }

    let flag = true;
    let button = document.createElement('button');
    button.textContent = 'Сохранить';
    button.style = 'margin-top: 10px';
    button.onclick = function() {
        buttonClick(stopObj, flag);
        if(flag){ 
            button.textContent = 'Удалить';
            flag = false;
        }
        else{
            button.textContent = 'Сохранить';
            flag = true;
        }
    };
    div.appendChild(button);

    let arrivalDataDiv = document.createElement("div");
    arrivalDataDiv.id = stopObj.ks_id;
    div.appendChild(arrivalDataDiv);
    return content;
}

function buttonClick(stopObj, save){
    if(save){
        value = "addFavoriteStop";
        createFavoriteStops(stopObj);
    }
    else{
        let u = document.getElementById(stopObj.ks_id + 'q');
        u.remove();
        value = "removeFavoriteStop";
    }
    const body = {
        favoriteStop: stopObj
    }
    const params = {
        value: value
    }
    let url = requestURL + '?' + ( new URLSearchParams( params ) ).toString();  
    sendRequest('POST', url, body)
        .catch(err => console.log(err))
}

function createArrivalData(data, stopObj){
    let div = document.getElementById(stopObj.ks_id);
    div.textContent = '';
    data.forEach((string) => {
        let h3 = document.createElement('h3');
        h3.innerHTML = string;
        div.appendChild(h3);
    });
}

function initStops(){
    for(let i = 0; i < stopsArray.length; ++i){
        let stopObj = stopsArray[i];

        const stop = new google.maps.Marker({
            position: { lat: stopObj.latitude, lng: stopObj.longitude },
            map,
            icon:{
                url: "images\\bus.png",
                scaledSize: new google.maps.Size(60,60)
            }
        });

        const infowindow = new google.maps.InfoWindow({
            maxWidth: 350
        });

        let content = createStop(stopObj);
        infowindow.setContent(content);

        stop.addListener("click", () => {
            if(trail) value = "getRouteArrivalToStop";
            else value = "getFirstArrivalToStop";
            const params = {
                value: value,
                ks_id: stopObj.ks_id,
                kr_id: trail.krId
            }
            let url = requestURL + '?' + (new URLSearchParams(params)).toString();
            sendRequest('GET', url)
                .then(data => createArrivalData(data, stopObj))
                .catch(err => console.log(err))
            infowindow.open(map, stop);
            stop.setAnimation(null);
        });

        stopMarkers.push(stop);
    }
}

function createListStops(stops, favoriteStops){
    const stopTemplate = document.querySelector("[data-li-stop-template]");
    let stopsContainer = '';
    if(favoriteStops) stopsContainer = document.querySelector("[data-ol-favorite-stops-container]");
    else{
        deleteRoute();
        stopsContainer = document.querySelector("[data-ol-stops-container]");
    }
    let stopsArray = [];
    if(Array.isArray(stops)) stopsArray = stops;
    else stopsArray.push(stops);
    stopsArray.forEach(item => {
        let stop = stopTemplate.content.cloneNode(true).children[0];
        stop.id = item.ks_id + 'q';
        const title = stop.querySelector("[data-stop]");
        title.textContent = item.title;
        title.addEventListener("click", () => {
            moveCenter(item);
        });
        stopsContainer.append(stop); 
    });
}

function searchStop(){
    const stopTemplate = document.querySelector("[data-stop-template]");
    const stopContainer = document.querySelector("[data-stops-container]");
    const searchInput = document.querySelector("[data-search]");
    searchInput.addEventListener("input", (v) => {
        const value = v.target.value.toLowerCase();
        stops.forEach(stop => {
            const isVisible = stop.title.toLowerCase().includes(value);
            if (value === '') stop.element.classList.add("hide");
            else stop.element.classList.toggle("hide", !isVisible);
        });
    });
    stops = stopsArray.map(obj => {
        let stop = stopTemplate.content.cloneNode(true).children[0];
        stop.addEventListener("click", () => {
            stops.forEach(stop => {
                stop.element.classList.add("hide");
            });
            moveCenter(obj); 
        });
        const title = stop.querySelector("[data-title]");
        title.textContent = obj.title;
        stopContainer.append(stop);
        stop.classList.add("hide");
        return { title: obj.title, element: stop }
    });
}

let animatedStop = undefined;

function moveCenter(obj){
    if (animatedStop !== undefined) animatedStop.setAnimation(null);
    let stop = stopMarkers.find(element => obj.latitude === element.getPosition().lat() 
        && obj.longitude === element.getPosition().lng()
    );
    map.setCenter(new google.maps.LatLng(obj.latitude, obj.longitude));
    stop.setAnimation(google.maps.Animation.BOUNCE);
    animatedStop = stop;
}

function leaveRoute(){
    trail = '';
    stopMarkers.forEach(marker =>marker.setVisible(true));
    deleteRoute();
}

function deleteRoute(){
    const stopsContainer = document.querySelector("[data-ol-stops-container]");
    stopsContainer.innerHTML = '';
}