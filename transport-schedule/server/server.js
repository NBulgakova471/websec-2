import fetch from 'node-fetch';
import http from 'http';
import sha1 from 'js-sha1';
import convert from 'xml-js';
const PORT = 5000;

function sendRequest (url) {
  return fetch(url)
    .then((result) => {
      if (result.status != 200) { throw new Error("Bad Server Response"); }
      return result.text();
    })
    .catch((error) => { console.log(error); });
}

async function getStops(){
  return await sendRequest('https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml');
}

async function getRoutesStructure(){
  return await sendRequest('https://tosamara.ru/api/v2/classifiers/routesAndStopsCorrespondence.xml');
}

async function getFirstArrivalToStop(ks_id){
  var authkey = sha1(ks_id + "just_f0r_tests");
  let url = `https://tosamara.ru/api/v2/json?method=getFirstArrivalToStop&KS_ID=${ks_id}&os=android&clientid=test&authkey=${authkey}`
  return await sendRequest(url);
}

async function getRouteArrivalToStop(ks_id, kr_id){ ///
  var authkey = sha1(kr_id + ks_id + "just_f0r_tests");
  let url = `https://tosamara.ru/api/v2/json?method=getRouteArrivalToStop&KS_ID=${ks_id}&KR_ID=${kr_id}&os=android&clientid=test&authkey=${authkey}`
  return await sendRequest(url);
}

function parseDataArrival(data){
  let parsedData = [];
  let arrival = data['arrival']
  arrival.forEach(element =>{
    let minutes = Math.floor(element['timeInSeconds'] / 60);
    let result = `${element['type']} №${element['number']} прибудет через ${minutes} минут`;
    parsedData.push(result);
  })
  return parsedData;
}

function determineTransportTypeId(transportType){
  if(transportType.includes('trolleybuses')) return 4;
  if(transportType.includes('buses')) return 1;
  if(transportType.includes('metros')) return 2;
  if(transportType.includes('trams')) return 3;
}

function determineRoute(data, stop, routeNumber, transportType){
  let transportTypeID = determineTransportTypeId(transportType);
  let ksIds = [];
  let krId = undefined;
  let result = undefined;
  data.forEach(route => {
    let number = route["number"]["_text"];
    let id = route["transportType"].id["_text"];
    if(number === routeNumber && id == transportTypeID){
      let stops = route["stop"];
      stops.forEach(item =>{
        let ks_id = item.KS_ID["_text"];
        let direction = item.direction["_text"];
        if(ks_id === stop.ks_id && direction === stop.direction) {
          krId = route["KR_ID"]["_text"];
          result = stops;
          return;
        }; 
      });
    }
  });
  result.forEach(stop => {
    ksIds.push(stop["KS_ID"]["_text"]);
  });
  return {krId, ksIds};
}

let favoriteStops = [];
let stops = convert.xml2json(await getStops(), {compact: true, spaces: 4});
let routesStructureString = convert.xml2json(await getRoutesStructure(), {compact: true, spaces: 4});
let routesStructure = JSON.parse(routesStructureString);

let data = {
  stops: stops,
  favoriteStops: favoriteStops
}

var server = http.createServer(async function(req, res){
    const params = new URLSearchParams(req.url.slice(1));
    let parameter = params.get('value');
    console.log('Server request');
    console.log(req.url, req.method);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Content-Type', 'application/json');

    if(req.method === 'POST'){
      req.on('data', (data) => {
        let request = JSON.parse(data);
        if (parameter === 'addFavoriteStop'){
          favoriteStops.push(request.favoriteStop);
        }
        if (parameter === 'removeFavoriteStop'){
          favoriteStops.pop(request.favoriteStop);
        }
        res.end();
      });
    }
    if(req.method === 'GET'){
      if(parameter === 'initMap') res.write(JSON.stringify(data));
      if (parameter === 'getFirstArrivalToStop') {
        let response = await getFirstArrivalToStop(params.get('ks_id'));
        response =  JSON.parse(response);
        let parsedData = parseDataArrival(response);
        res.write(JSON.stringify(parsedData));
      }
      if (parameter === 'getRouteArrivalToStop') {
        let ks_id = params.get('ks_id');
        let kr_id = params.get('kr_id');
        let response = await getRouteArrivalToStop(ks_id, kr_id);
        response =  JSON.parse(response);
        let parsedData = parseDataArrival(response);
        res.write(JSON.stringify(parsedData));
      }
      if (parameter === 'initRoute') {
        let ks_id = params.get('ks_id');
        let direction = params.get('direction');
        let routeNumber = params.get('routeNumber');
        let transportType = params.get('transportType');
        let route = routesStructure["routes"]["route"];
        let data = determineRoute(route, {ks_id, direction}, routeNumber, transportType);
        res.write(JSON.stringify(data));
      }
      res.end();
    }
});


server.listen(PORT, 'localhost');

console.log(`Node.js web server at port ${PORT} is running...`);