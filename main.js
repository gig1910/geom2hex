const turf = require('@turf/turf');

const fs           = require('fs');
let f_in_name;
let f_out_name;
let radius         = 1;
let different_mode = true;

if(process.argv.length > 2){
	let i = 2;
	while(i < process.argv.length){
		let argV = process.argv[i];

		switch(true){
			case argV === '--help' || argV === '/h':            //Вывод справки по ключам
				console.info(`
Справка по ключам
-r --raduis     -- Радиус многоугольника (шестигранника) в километрах, разделитель дробной части точка
-i --intersects -- Режим пересечения, без обрезко по области входного полигона
f_in			-- Путь к входному файлу с полигонами
f_out			-- Путь в результирующему файлу

Пример строки запуска
nodejs main.js -r 0.5 -i in.json out.json
`);

				break;

			case argV === '-r' || argV === '--radius':      //Обновляем значение количества потоков
				radius = parseFloat(process.argv[++i]);
				if(Number.isNaN(radius)){
					console.error('Ошибка в значении радиуса. Должно быть число, а передано %s', process.argv[i]);
					process.exit(-100);
				}
				break;

			case argV === '-i' || argV === '--intersects': //Обновляем значение количества потоков
				different_mode = false;
				break;

			default:
				if(!f_in_name){
					f_in_name = process.argv[i];
				}else if(!f_out_name){
					f_out_name = process.argv[i];
				}else{
					console.error('Нераспознанный параметр %s. Игнорируется...', process.argv[i]);
				}
				break;
		}

		i++;
	}
}

if(!f_in_name){
	throw new Error('Не передано имя входного файла');
}

if(!f_out_name){
	throw new Error('Не передано имя выходного файла');
}

if(!fs.existsSync(f_in_name)){
	throw new Error('Входной файл не обнаружен');
}
let GEOJSON_in;
try{
	GEOJSON_in = fs.readFileSync(f_in_name);
}catch(err){
	throw new Error('Не могу прочитать входной файл');
}

let pol = JSON.parse(GEOJSON_in);

function processGeom(geom){
	let bbox = turf.bbox(geom);

	let hexGrid = turf.hexGrid(bbox, radius, 'kilometers', false);

	hexGrid.features = hexGrid
		.features
		.map(el => different_mode ? turf.intersect(geom, el) : el)
		.filter(el => different_mode ? !!el : turf.booleanIntersects(geom, el));

	return hexGrid;

}

let result;

if(pol.hasOwnProperty('features') && pol.features.length > 0){
	result = [];
	for(let i=0; i<pol.features.length; i++){
		let _pol = pol.features[i].geometry;
		result.push(processGeom(_pol));
	}
}else{
	result = processGeom(pol);
}

try{
	fs.writeFileSync(f_out_name, JSON.stringify(result));

}catch(err){
	throw new Error('Не могу записать в входной файл');
}

console.log('Done');
