class CurrencyConverter {

    constructor() {
        this.registerServiceWorker();
        this.dbPromise = this.openDatabase();
        this.getAllCurrencies();
    }
    
    registerServiceWorker() {
        if (!navigator.serviceWorker) return;
        navigator.serviceWorker.register('sw.js').then(reg => {});
    } 
    /*  indexDB database */
    openDatabase() {
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return Promise.resolve();
          }
        
          return idb.open('currencyConverter', 4, upgradeDb => {
                switch(upgradeDb.oldVersion) {
                    case 0:
                        upgradeDb.createObjectStore('currencies');
                    case 2:
                        upgradeDb.transaction.objectStore('currencies').createIndex('id', 'id', {unique: true});
                    case 3:
                        upgradeDb.createObjectStore('currencyRates', {keyPath: 'query'});
                        upgradeDb.transaction.objectStore('currencyRates').createIndex('query', 'query', {unique: true});
                }
         });
    }
    /* list of currencies to database store */
    addCurrenciesToCache(currencies) {
        this.dbPromise.then(db => {
            if (!db) return;
            
            let tx = db.transaction('currencies', 'readwrite'); 
            let store = tx.objectStore('currencies'); 
            for (const currency of currencies) {
                store.put(currency, currency.id);
            }
          

            
            store.index('id').openCursor(null, "prev").then(cursor => {
                return cursor.advance(160);
            }).then(function deleteRest(cursor) {
                if (!cursor) return;
                cursor.delete();
                return cursor.continue().then(deleteRest);
            });
        }).then(() => {
            console.log('list of currencies added to cache (db)');
         }).catch(error => console.log('Something went wrong: '+ error));
    }
    /* conversion rate */
    addCurrencyRateToCache(rate, fromCurrency, toCurrency) {
        this.dbPromise.then(db => {
            if (!db) return;
            
            let tx = db.transaction('currencyRates', 'readwrite');
            let store = tx.objectStore('currencyRates'); 
            let query = `${fromCurrency}_${toCurrency}`;
            
            store.put({ query, rate });

            
           store.index('query').openCursor(null, "prev").then(cursor => {
                return cursor.advance(50);
            }).then(function deleteRest(cursor){
                if (!cursor) return;
                cursor.delete();
                return cursor.continue().then(deleteRest);
            });
        }).then(() => {
            console.log('Currency rate for ' + fromCurrency + ' and ' + toCurrency + ' added to cache');
         }).catch(error => console.log('Something went wrong: '+ error));
    }
    //+
    // get cached currency rate
    getCurrencyRateFromCache(fromCurrency, toCurrency) {
       return this.dbPromise.then(db => {
            if (!db) return;

            const query = `${fromCurrency}_${toCurrency}`;
            let tx = db.transaction('currencyRates', 'readwrite');
            let store = tx.objectStore('currencyRates'); 

           return store.index('query').get(query);
        }).then( RateObj => { 
                   const currencyRate  = RateObj.rate;
                    return {currencyRate, appStatus: 'offline'}; 
         }).catch(error => {
             console.log(' No rate was found in cache:');
             this.postToHTMLPage('','No rate was found in cache');
             return error;
        });
    }
    
    showCachedCurrencies() {
        return this.dbPromise.then( db => {

            if (!db) return;
        
            let index = db.transaction('currencies')
              .objectStore('currencies').index('id');
        
            return index.getAll().then( currencies => {
                console.log('Currencies fetched from cache');

                let selectFields = document.querySelectorAll('select.currency');

                
                for(const currency of currencies){
                    let option = this.createElement('option');
                    if(currency.hasOwnProperty('currencySymbol')) option.text = `${currency.currencyName} (${currency.currencySymbol})`;
                    else option.text = `${currency.currencyName} (${currency.id})`;
                    option.value = currency.id;

                    //add currency to the select field
                    this.appendElement(selectFields,option);
                }
                this.postToHTMLPage('msg', 'No internet connection');
            });
          });
    }
    
    getAllCurrencies() {
        fetch('https://free.currencyconverterapi.com/api/v5/currencies').then(response => {
            return response.json();
        }).then(response => {
            let currencies = Object.values(response.results);
            let selectFields = document.querySelectorAll('select.currency');

            
            for(const currency of Object.values(currencies)){
                let option = this.createElement('option');
                if(currency.hasOwnProperty('currencySymbol')) option.text = `${currency.currencyName} (${currency.currencySymbol})`;
                else option.text = `${currency.currencyName} (${currency.id})`;
                 option.value = currency.id;

                 
                 this.appendElement(selectFields,option);
            }
            
            this.addCurrenciesToCache(currencies); 
            this.postToHTMLPage('you are online');
           
        }).catch( error => {
            console.log('Offline: '+ error);
            this.showCachedCurrencies(); 
        });
    }
    
    // Method for html page/ DOM communication
    postToHTMLPage(wht, msg, outputResult = {}) {
       if(wht === 'result') { 
            document.getElementById('result').innerHTML = `${outputResult.toCurrency} ${outputResult.result.toFixed(2)}`;
        }
        else if(wht = 'offlineFailure') {
            document.getElementById('result').innerHTML = '0.00';
        }

        if(msg !== ''){
            
            document.getElementById('alert').innerHTML = msg;
        }
        return;
    }
    
    getConversionRate(fromCurrency, toCurrency) {
        fromCurrency = encodeURIComponent(fromCurrency);
        toCurrency = encodeURIComponent(toCurrency);
        let query = fromCurrency + '_' + toCurrency;

        return fetch('https://free.currencyconverterapi.com/api/v5/convert?q='+ query + '&compact=ultra').then(response => {
            return response.json();
        }).then(response => {
            

            const currencyRate = response[Object.keys(response)];
            return  {currencyRate, appStatus: 'online'};
        }).catch(error => {
           
            const currencyRate = this.getCurrencyRateFromCache(fromCurrency, toCurrency);
            return  currencyRate;
        });
    }
     
    createElement(element) {
        return document.createElement(element);
        return;
    }
     
   appendElement(parentElement, element)
   {
       let element2 = element.cloneNode(true); 
       parentElement[0].appendChild(element);
       parentElement[1].appendChild(element2);
       return;
   }
} 


(function(){
    const converter = new CurrencyConverter(); 
    document.getElementById('convert').addEventListener('click', () =>{
        let msg = '';
         converter.postToHTMLPage('msg', 'conversion in progress, please wait...');
        
        const amount = document.getElementById('amount').value;
        const fromCurrency = document.getElementById('from-currency').value;
        const toCurrency = document.getElementById('to-currency').value;
    
        
        if(amount === '' || amount === 0 || isNaN(amount)) msg = 'Must be a number greater than 0.';
        else if(fromCurrency ==='') msg = 'Specify the currency to convert from.';
        else if(toCurrency ==='') msg = 'Specify the currency to convert to.';
        else if (fromCurrency === toCurrency) msg = 'Do choose a different currency to convert to.';
        else {
            
            converter.getConversionRate(fromCurrency,toCurrency).then( response =>{ 
                 const rate = response.currencyRate;
                 const appStatus = response.appStatus;
                if(rate !== undefined)
                {
                    const result = amount * rate; 
                    msg = "Exchange rate : " + rate;
                    converter.postToHTMLPage('result', msg, {result, toCurrency}); 
                    if(appStatus ==='online')  converter.addCurrencyRateToCache(rate, fromCurrency, toCurrency); 
                }
                else converter.postToHTMLPage('offlineFailure', 'No Internet Connection');
            }).catch( error => {
                console.log('No rate was found in cache: ');
                converter.postToHTMLPage('', error);
            });
        }
    
        converter.postToHTMLPage('msg', msg); 
    });


})();
