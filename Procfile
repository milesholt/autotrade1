#web: sh -c 'cd ./app/autotrade/ && ionic --help'
#web: sh -c 'cd ./app/autotrade/ && ionic serve --port $PORT --nobrowser --nolivereload --noopen'
#web: sh -c 'cd ./app/autotrade/ && npm start'
#web: ionic serve --port $PORT --nobrowser --nolivereload --noopen
#web: sh -c 'cd ./app/autotrade/www/ && npm start'
#web: npm start app/autotrade/
#worker: node core/tests/streamtest.js
worker: node --trace-warnings core/autotrade2.js 
#worker: node tests/apicheck.js
