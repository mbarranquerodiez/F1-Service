import { Request, Response } from 'express';
import db from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class EndPoitnsController {

    getRaceDetails = async (city : string , country : string, timestamp : string) => {
        if (!city || !country || !timestamp) {
            return {
                success: false,
                message: "Faltan parámetros obligatorios"
            };
        }
    
        try {
            const fetch = require('node-fetch');
            
            // 1. Obtener coordenadas con Nominatim
            let nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json`;
            
            let nominatimRes = await fetch(nominatimUrl);
            if (!nominatimRes.ok) {
                return {
                    success: false,
                    message: "Error al consultar la API de Nominatim"
                };
            }
            
            let nominatimData = await nominatimRes.json();
            
            // Si no se encuentra la ciudad, intentar solo con el país
            if (!Array.isArray(nominatimData) || nominatimData.length === 0) {
                nominatimUrl = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(country)}&format=json`;
                nominatimRes = await fetch(nominatimUrl);
                
                if (!nominatimRes.ok) {
                    return {
                        success: false,
                        message: "Error al consultar la API de Nominatim"
                    };
                }
                
                nominatimData = await nominatimRes.json();
                
                if (!Array.isArray(nominatimData) || nominatimData.length === 0) {
                    return {
                        success: false,
                        message: "No se encontraron coordenadas para la ciudad y país proporcionados"
                    };
                }
            }
            
            const { lat, lon, display_name } = nominatimData[0];
    
            // 2. Obtener datos meteorológicos de Open-Meteo
            const date = timestamp.substring(0,10); // YYYY-MM-DD
            const hourSpain = timestamp.substring(11,16); // HH:mm en hora de España
            
            const today = new Date().toISOString().substring(0,10);
            let meteoUrl;
            
            if (date < today) {
                // Datos históricos
                meteoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,rain,precipitation&start_date=${date}&end_date=${date}&timezone=auto`;
            } else {
                // Datos futuros/actuales
                meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&start_date=${date}&end_date=${date}&timezone=auto`;
            }
            
            const meteoRes = await fetch(meteoUrl);
            
            if (!meteoRes.ok) {
                return {
                    success: false,
                    message: "Error al consultar la API de Open-Meteo"
                };
            }
            
            const meteoData = await meteoRes.json();
            
            if (!meteoData.hourly || !meteoData.hourly.time) {
                return {
                    success: false,
                    message: "No se encontraron datos meteorológicos"
                };
            }
            
            // 3. Calcular conversión horaria
            const circuitTimezone = meteoData.timezone || 'UTC';
            const circuitOffsetSeconds = meteoData.utc_offset_seconds || 0;
            
            // Calcular offset de España (CET/CEST) en la fecha de la carrera
            const raceDate = new Date(date + 'T00:00:00Z');
            const year = raceDate.getUTCFullYear();
            
            // Último domingo de marzo (cambio a horario de verano)
            let marchLastSunday = new Date(Date.UTC(year, 2, 31, 1, 0, 0));
            while (marchLastSunday.getUTCDay() !== 0) {
                marchLastSunday.setUTCDate(marchLastSunday.getUTCDate() - 1);
            }
            
            // Último domingo de octubre (cambio a horario de invierno)
            let octoberLastSunday = new Date(Date.UTC(year, 9, 31, 1, 0, 0));
            while (octoberLastSunday.getUTCDay() !== 0) {
                octoberLastSunday.setUTCDate(octoberLastSunday.getUTCDate() - 1);
            }
            
            const isDST = raceDate >= marchLastSunday && raceDate < octoberLastSunday;
            const spainOffsetSeconds = isDST ? 7200 : 3600; // CEST (UTC+2) o CET (UTC+1)
            
            // Calcular diferencia horaria
            const offsetDiffSeconds = circuitOffsetSeconds - spainOffsetSeconds;
            const offsetDiffHours = offsetDiffSeconds / 3600;
            
            // Convertir hora de España a hora local del circuito
            const [hoursSpain, minutesSpain] = hourSpain.split(':').map(Number);
            let hoursLocal = hoursSpain + offsetDiffHours;
            const minutesLocal = minutesSpain;
            
            // Ajustar si sale del rango 0-23
            while (hoursLocal >= 24) hoursLocal -= 24;
            while (hoursLocal < 0) hoursLocal += 24;
            
            const raceLocalHour = String(Math.floor(hoursLocal)).padStart(2, '0') + ':' + String(minutesLocal).padStart(2, '0');
            
            // 4. Buscar el índice de la hora de la carrera
            let raceIndex = meteoData.hourly.time.findIndex((t: string) => t.substring(11,16) === raceLocalHour);
            
            if (raceIndex === -1) {
                const [targetHourStr] = raceLocalHour.split(':');
                const targetHour = parseInt(targetHourStr);
                raceIndex = meteoData.hourly.time.findIndex((t: string) => parseInt(t.substring(11,13)) === targetHour);
                
                if (raceIndex === -1) {
                    return {
                        success: false,
                        message: `No se encontraron datos para la hora ${raceLocalHour}`
                    };
                }
            }
            

            // 5. Preparar datos horarios
            const hourlyData = meteoData.hourly.time.map((time: string, i: number) => ({
                time: time.substring(11,16),
                temperature: meteoData.hourly.temperature_2m[i],
                rain: meteoData.hourly.rain ? meteoData.hourly.rain[i] : (meteoData.hourly.precipitation ? meteoData.hourly.precipitation[i] : 0)
            }));
            
            // 6. Preparar respuesta
            const result = {
                city,
                country,
                date,
                raceTime: raceLocalHour,
                raceTimeSpain: hourSpain,
                timezone: circuitTimezone,
                offsetDiff: offsetDiffHours,
                temperature: meteoData.hourly.temperature_2m[raceIndex],
                rain: meteoData.hourly.rain ? meteoData.hourly.rain[raceIndex] : (meteoData.hourly.precipitation ? meteoData.hourly.precipitation[raceIndex] : 0),
                hourlyData
            };

            return {
                success: true,
                raceDetails: result
            };
            
        } catch (error) {
            console.error('❌ Error en getRaceDetails:', error);
            return {
                success: false,
                message: 'Error al procesar la solicitud'
            };
        }
    };

    getRaceResults = async (year: number, round: number) => {
        try {
            const fetch = require('node-fetch');
            
            // Llamar directamente a la API con año y round
            const resultsUrl = `https://f1api.dev/api/${year}/${round}/race`;
            
            const resultsResponse = await fetch(resultsUrl);
            if (!resultsResponse.ok) {
                return {
                    success: false,
                    message: 'No se pudieron obtener los resultados de la carrera'
                };
            }
            
            const resultsData = await resultsResponse.json();
            
            if (!resultsData.races || !resultsData.races.results) {
                return {
                    success: false,
                    message: 'No hay resultados disponibles para esta carrera'
                };
            }
            
            return {
                success: true,
                results: resultsData.races.results,
                raceName: resultsData.races.raceName,
                round: resultsData.races.round
            };
            
        } catch (error) {
            console.error('❌ Error al obtener resultados de la carrera:', error);
            return {
                success: false,
                message: 'Error al procesar la solicitud de resultados'
            };
        }
    };

    getRacesByYear = async (year : number) => {
    
        try {
          // Validar el parámetro year
          if (!year || isNaN(year) || year < 1950 || year > new Date().getFullYear()) {
            throw new Error('Invalid year provided');
          }
          
          let currentYear = year;
          let attempts = 0;
          const maxAttempts = 2; // Intentar año actual + 1 año anterior
          
          while (attempts < maxAttempts) {
            try {
              // Llamada a la API externa de OpenF1
              const apiUrl = `https://f1api.dev/api/${currentYear}`;
              const response = await fetch(apiUrl);
          
              if (response.ok) {
                const data = await response.json();
                
                // Verificar si races existe y es un array con datos
                if (Array.isArray(data.races) && data.races.length > 0) {
                  return { races: data.races, actualYear: currentYear };
                }
                
                // Si la respuesta es OK pero no hay races, intentar año anterior
                console.log(`No hay carreras para ${currentYear}, intentando con ${currentYear - 1}`);
                currentYear--;
                attempts++;
                continue;
              }
              
              // Si es 404 o no hay datos, intentar con el año anterior
              if (response.status === 404 || !response.ok) {
                console.log(`No hay datos para ${currentYear}, intentando con ${currentYear - 1}`);
                currentYear--;
                attempts++;
                continue;
              }
              
            } catch (fetchError) {
              console.log(`Error al obtener datos para ${currentYear}:`, fetchError);
              currentYear--;
              attempts++;
            }
          }
          
          // Si después de todos los intentos no hay datos
          return { races: [], actualYear: year };
      
        } catch (error) {
          throw error; // Re-lanzar el error para que el llamador lo maneje
        }
    };

    getRacesInfo = async () => {
        try {
            // Solicitud a la API de última carrera
            const lastRaceResponse = await fetch('https://f1api.dev/api/current/last');
            const lastRaceData = await lastRaceResponse.json();
    
    
            // Solicitud a la API de próxima carrera
            const nextRaceResponse = await fetch('https://f1api.dev/api/current/next');
            const nextRaceData = await nextRaceResponse.json();
    
            // Manejar respuestas
            const racesInfo = {
                lastRace: lastRaceResponse.ok ? lastRaceData : { error: lastRaceData.message || 'No se encontraron datos de la última carrera' },
                nextRace: nextRaceResponse.ok ? nextRaceData : { error: nextRaceData.message || 'No se encontraron datos de la próxima carrera' }
            };
    
            return racesInfo;
        } catch (error) {
            console.error('Error al obtener información de carreras:', error);
            return {
                lastRace: { error: 'Error al conectar con la API de última carrera' },
                nextRace: { error: 'Error al conectar con la API de próxima carrera' }
            };
        }
    };

    getAllDriverByYear = async (year : number) => {
    
        try { 

            if (!year) {
                const response = {
                    success: false,
                    message: "No se proporcionó el año",
                    actualYear: year
                };
                return response;
            }
            
            let currentYear = year;
            let attempts = 0;
            const maxAttempts = 2; // Intentar año actual + 1 año anterior
            
            while (attempts < maxAttempts) {
                try {
                    const apiUrl = `https://f1api.dev/api/${currentYear}/drivers`;
                    const fetch = require('node-fetch');
                    const response = await fetch(apiUrl);
                    
                    if (response.ok) {
                        const data = await response.json();

                        let drivers: any[] | undefined = undefined;
                        if (Array.isArray(data?.drivers)) {
                            drivers = data.drivers;
                        } else if (Array.isArray(data)) {
                            drivers = data;
                        }

                        if (drivers && drivers.length > 0) {
                            const responseData = {
                                success: true,
                                drivers: drivers,
                                actualYear: currentYear
                            };
                            return responseData;
                        }
                        
                        // Si hay respuesta OK pero no hay drivers, intentar año anterior

                        currentYear--;
                        attempts++;
                        continue;
                    }
                    
                    // Si es 404 o no hay datos, intentar con el año anterior
                    if (response.status === 404 || !response.ok) {

                        currentYear--;
                        attempts++;
                        continue;
                    }
                    
                } catch (fetchError) {
                    console.log(`Error al obtener pilotos para ${currentYear}:`, fetchError);
                    currentYear--;
                    attempts++;
                }
            }
            
            // Si después de todos los intentos no hay datos
            const response = {
                success: false,
                message: "No se encontraron datos de pilotos",
                actualYear: year
            };
            return response;
            
        } catch (error) {
            const response ={
                success: false,
                message:"Error al realizar petición a la API externa",
                actualYear: year
            }
            return response;
        };


    }

    getDriverDetails = async (year: number, driverId: string) => {
        try {

        if (!year || !driverId) {
            console.error('Faltan parámetros obligatorios');
            const response = {
                success: false,
                message: 'Faltan parámetros obligatorios'
            };
            return response;
        }

        const apiUrl = `https://f1api.dev/api/${encodeURIComponent(year)}/drivers/${encodeURIComponent(driverId)}`;
        const fetch = require('node-fetch');
        const responseApi   = await fetch(apiUrl);
        if (!responseApi.ok) {
            // Si la API devuelve 404, reflejamos 404; otros errores -> 500
            if (responseApi.status === 404) {
                const response = {
                    success: false,
                    message: 'Piloto no encontrado para ese año'
                };
                return response;
            }

            const response = {
                    success: false,
                    message: 'Error al Consultar la API'
                };
                return response;
        }
        const data = await responseApi.json();

        // La API puede devolver un objeto o un array con un solo elemento. Normalizamos.
        let raw: any = undefined;
        if (Array.isArray(data) && data.length > 0) {
            raw = data[0];
        } else if (data && typeof data === 'object') {
            raw = data;
        }

        if (!raw) {
            const response = {
                success: false,
                message: 'Piloto no encontrado para ese año'
            };
        return response;        
    }

        // Extraer y filtrar solo los campos solicitados
        const d = raw.driver || {};
        const t = raw.team || {};

        const filtered: any = {
            driverId: d.driverId,
            name: d.name,
            surname: d.surname,
            nationality: d.nationality,
            birthday: d.birthday,
            number: d.number,
            shortName: d.shortName,
            team: {
                teamId: t.teamId,
                teamName: t.teamName,
                teamNationality: t.teamNationality,
                firstAppeareance: t.firstAppeareance,
                constructorsChampionships: t.constructorsChampionships,
                driversChampionships: t.driversChampionships
            }
        };

        // Construir título de Wikipedia "Nombre_Apellido" y consultar summary en español
        const nameParts = [d.name, d.surname].filter(Boolean) as string[];
        let wikiTitle: string | undefined = undefined;
        if (nameParts.length === 2) {
            wikiTitle = `${nameParts[0]}_${nameParts[1]}`;
            try {
                const wikiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
                const fetch = require('node-fetch');
                const wikiRes = await fetch(wikiUrl, { headers: { 'accept': 'application/json' } });
                if (wikiRes.ok) {
                    const wikiData = await wikiRes.json();
                    if (wikiData && typeof wikiData.extract === 'string') {
                        filtered.description = wikiData.extract;
                    }
                }
            } catch (e) {
                console.warn('No se pudo obtener el resumen de Wikipedia:', e);
            }
        }

        // Llamada a Google News RSS para obtener noticias del último año y añadirlas al JSON
        try {
            const fetch = require('node-fetch');
            const { XMLParser } = require('fast-xml-parser');
            const personForQuery = wikiTitle || nameParts.join('_');
            const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(personForQuery)}&hl=es&gl=ES&ceid=ES:es`;
            const rssRes = await fetch(rssUrl, { headers: { 'accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' } });
            if (rssRes.ok) {
                const rssText = await rssRes.text();
                const parser = new XMLParser({ ignoreAttributes: false });
                const rssJson = parser.parse(rssText);
                const items = rssJson?.rss?.channel?.item;
                const list: any[] = Array.isArray(items) ? items : items ? [items] : [];

                // Tomar únicamente las últimas 10 noticias por fecha de publicación (más recientes primero)
                const news = list
                    .map((it: any) => {
                        const title = it?.title;
                        const link = typeof it?.link === 'string' ? it.link : undefined;
                        const pubDateStr = it?.pubDate;
                        const pub = pubDateStr ? new Date(pubDateStr) : undefined;
                        return { title, link, date: pub ? pub.toISOString() : undefined, _pub: pub };
                    })
                    .filter((n: any) => n.title && n.link && n._pub)
                    .sort((a: any, b: any) => (b._pub as Date).getTime() - (a._pub as Date).getTime())
                    .slice(0, 10)
                    .map((n: any) => ({ title: n.title, link: n.link, date: n.date }));

                if (news.length > 0) {
                    filtered.news = news;
                } else {
                    filtered.news = [];
                }
            } else {
                filtered.news = [];
            }
        } catch (e) {
            console.warn('No se pudieron obtener noticias de Google News:', e);
            (filtered as any).news = [];
        }
        const response = {
            success: true,
            driver: filtered
        };
        console.log('Response:', response.driver.news);
        return response;

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        const response = {
            success: false,
            message: 'Error al procesar la solicitud'
        };
        return response;
    }
    }

    getGalleryPageInfo = async (filters: any) => {

        console.log("Filtros recibidos en getGalleryPageInfo:", filters);


    try {
        // Asumimos que la clave de API de Unsplash está en una variable de entorno
        const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
        if (!UNSPLASH_ACCESS_KEY) {
            throw new Error('Clave de API de Unsplash no configurada');
        }

        // Construir query de búsqueda a partir de los filtros
        let queryParts: string[] = ['Formula 1']; // Siempre incluir "Formula 1"
        
        if (filters && filters !== null) {
            // Agregar año si existe
            if (filters.year && filters.year.trim() !== '') {
                queryParts.push(filters.year);
            }
            
            // Agregar equipo si existe
            if (filters.team && filters.team.trim() !== '') {
                queryParts.push(filters.team);
            }
            
            // Agregar carrera si existe
            if (filters.race && filters.race.trim() !== '') {
                queryParts.push(filters.race);
            }
        }
        
        const query = queryParts.join(' ');
        console.log("Query de búsqueda construido:", query);

        // Generar página aleatoria entre 1 y 10 para obtener imágenes diferentes
        const randomPage = Math.floor(Math.random() * 10) + 1;
        
        const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${randomPage}`;
        console.log("URL de API:", apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });
        console.log("5")

        if (!response.ok) {
            return {
                success: false,
                message: 'No se encontraron datos de la galería'
            };
        }
        console.log("6")

        const data = await response.json();
        console.log("7")
        console.log(data)

        // Mapear los datos de la respuesta a una estructura simple con información asociada
        const gallery = data.results.map((photo: any) => ({
            id: photo.id,
            url: photo.urls.regular, // URL de imagen mediana
            urlFull: photo.urls.full, // URL de imagen completa
            alt: photo.alt_description || 'Imagen sin descripción',
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html,
            likes: photo.likes,
            width: photo.width,
            height: photo.height,
            // Puedes agregar más campos como color: photo.color, etc.
        }));
        console.log(gallery);
                console.log("8")


        return { success: true, gallery: gallery };

    } catch (error) {
        console.error('Error al obtener información de la galería:', error);
        return { success: false, message: 'Error al obtener información de la galería' };
    }
    }

    // Helper privado para llamadas a la API de F1
    private async fetchF1API(endpoint: string, year: number) {
        let currentYear = year;
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
            try {
                const apiUrl = `https://f1api.dev/api/${currentYear}/${endpoint}`;
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, data, actualYear: currentYear };
                }
                
                // Si falla, intentar con año anterior
                console.log(`No hay datos de ${endpoint} para ${currentYear}, intentando con ${currentYear - 1}`);
                currentYear--;
                attempts++;
            } catch (error) {
                console.log(`Error al obtener ${endpoint} para ${currentYear}:`, error);
                currentYear--;
                attempts++;
            }
        }
        
        return { success: false, data: null, actualYear: year };
    }

    // Obtener equipos por año - actualizado
    getTeamsByYear = async (year: number) => {
        try {
            let currentYear = year;
            let attempts = 0;
            const maxAttempts = 2;
            
            while (attempts < maxAttempts) {
                try {
                    const apiUrl = `https://f1api.dev/api/${currentYear}/teams`;
                    const response = await fetch(apiUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (Array.isArray(data.teams) && data.teams.length > 0) {
                            const teams = [...new Set(
                                data.teams
                                    .map((t: any) => t.teamName)
                                    .filter(Boolean)
                            )];
                            

                            return { 
                                success: true, 
                                teams: teams.sort(),
                                actualYear: currentYear 
                            };
                        }
                        
                        currentYear--;
                        attempts++;
                        continue;
                    }
                    
                    if (response.status === 404 || !response.ok) {
                        currentYear--;
                        attempts++;
                        continue;
                    }
                } catch (fetchError) {
                    console.error(`Error al obtener equipos para ${currentYear}:`, fetchError);
                    currentYear--;
                    attempts++;
                }
            }
            
            return { success: false, teams: [], actualYear: year };
        } catch (error) {
            console.error('Error al obtener equipos:', error);
            return { success: false, teams: [], actualYear: year };
        }
    }

    // Obtener circuitos por año
    getCircuitsByYear = async (year: number) => {
        try {
            const result = await this.fetchF1API('', year); // endpoint raíz trae las carreras
            
            if (result.success && result.data?.races) {
                // Extraer circuitos únicos
                const circuits = result.data.races
                    .map((race: any) => race.circuit?.circuitName || race.raceName)
                    .filter(Boolean);
                
                // Eliminar duplicados y ordenar
                const uniqueCircuits = [...new Set(circuits)].sort();
                
                return { 
                    success: true, 
                    circuits: uniqueCircuits,
                    actualYear: result.actualYear 
                };
            }
            
            return { success: false, circuits: [], actualYear: year };
        } catch (error) {
            console.error('Error al obtener circuitos:', error);
            return { success: false, circuits: [], actualYear: year };
        }
    }
    
    getCircuits = async (): Promise<any[]> => {  // Añadido: Retorna Promise<any[]> para tipado
    console.log("Entrando en getCircuits");
    return new Promise((resolve, reject) => {  // Convertimos el callback en Promise
      db.query(
        `SELECT id, name FROM circuits ORDER BY name DESC`,
        [],
        (err: any, rows: any[]) => {
          if (err) {
            console.error('Error al ejecutar la consulta:', err);
            reject(err);  // Rechazamos la Promise en caso de error
            return;
          }
          const circuits = Array.isArray(rows) ? rows : [];
          resolve(circuits);  // Resolvemos con los datos
        }
      );
    });
  };

    loadCircuitDetails = async (id: string): Promise<any | null> => {  // Tipado: string minúscula, Promise para async
    console.log("loadCircuitDetails id:", id);
    if (!id) {
        return null;
    }

    return new Promise((resolve, reject) => {  // Envuelve el callback en Promise
        db.query(
        `SELECT
            id,
            location,
            name,
            opened,
            first_gp,
            length,
            altitude,
            bbox,
            geom,
            /* Si 'geom' es un tipo espacial, MySQL devolverá el GeoJSON aquí */
            ST_AsGeoJSON(geom) AS geom_geojson
        FROM circuits
        WHERE id = ?
        LIMIT 1`,
        [id],
        (err: any, rows: any[]) => {
            if (err) {
            console.error('Error al ejecutar la consulta:', err);
            reject(err);  // Rechaza la Promise para propagar error al await
            return;
            }

            if (!rows || rows.length === 0) {
            resolve(null);  // Resuelve null si no hay rows
            return;
            }

            const row = rows[0] as any;

            // Helpers de parseo tolerante (igual)
            const parseJsonMaybe = (val: any) => {
            try {
                if (val == null) return undefined;
                if (Buffer.isBuffer(val)) {
                const s = val.toString('utf8');
                return JSON.parse(s);
                }
                if (typeof val === 'string') {
                return JSON.parse(val);
                }
                if (typeof val === 'object') return val;
                return undefined;
            } catch {
                return undefined;
            }
            };

            // Parsear bbox y geom (igual)
            let bbox = parseJsonMaybe(row.bbox);
            let geometry: any = undefined;

            // Prioridad: columna calculada ST_AsGeoJSON
            if (row.geom_geojson) {
            geometry = parseJsonMaybe(row.geom_geojson);
            }

            // Si no hay, intentar con la columna original
            if (!geometry) {
            geometry = parseJsonMaybe(row.geom);
            }

            // Si viene como Feature con geometry dentro
            if (geometry && geometry.type === 'Feature' && geometry.geometry) {
            geometry = geometry.geometry;
            }

            // Asegurar que la geometría tiene formato GeoJSON esperado
            if (!geometry || !geometry.type || !geometry.coordinates) {
            resolve(null);  // Resuelve null si geometry inválida
            return;
            }

            const feature = {
            type: 'Feature',
            properties: {
                id: row.id,
                Location: row.location,
                Name: row.name,
                opened: row.opened,
                firstgp: row.first_gp,
                length: row.length,
                altitude: row.altitude
            },
            bbox: Array.isArray(bbox) ? bbox : undefined,
            geometry
            };

            resolve(feature);  // Resuelve con el feature
        }
        );
    });
    };
}