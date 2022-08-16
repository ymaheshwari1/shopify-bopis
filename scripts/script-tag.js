(function () {
    let jQueryBopis;
    let $location;
    let backdrop;
    let dropdownBackdrop;
    let currentProduct;
    let stores;
    let storesWithInventory;
    let homeStore;
    let result;

    // defining a global object having properties which let merchant configure some behavior
    this.bopisCustomConfig = {
        'enableCartRedirection': true
    };

    // TODO Generate instance specific code URL in FTL. Used with <#noparse> after this code so that `` code is escaped
    // let baseUrl = '<@ofbizUrl secure="true"></@ofbizUrl>';
    let baseUrl = '';

    let loadScript = function(url, callback){

        let script = document.createElement("script");
        script.type = "text/javascript";

        if (script.readyState){ 
            script.onreadystatechange = function(){
                if (script.readyState == "loaded" || script.readyState == "complete"){
                    script.onreadystatechange = null;
                    callback();
                }
            };
        } else {
            script.onload = function(){
                callback();
            };
        }
    
        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
        
    };

    // adding css in the current page
    let style = document.createElement("link");
    style.rel = 'stylesheet';
    style.type = 'text/css';
    style.href = `${baseUrl}/api/shopify-bopis.min.css`;

    document.getElementsByTagName("head")[0].appendChild(style);

    // add font-awesome using cloudfare cdn to load the caret up and down symbol
    let fontAwesome = document.createElement("link");
    fontAwesome.rel = 'stylesheet';
    fontAwesome.type = 'text/css';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
    document.getElementsByTagName("head")[0].appendChild(fontAwesome)

    if ((typeof jQuery === 'undefined') || (parseFloat(jQuery.fn['jquery']) < 1.7)) {
        loadScript('//ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js', function(){
            jQueryBopis = jQuery.noConflict(true);
            jQueryBopis(document).ready(async function() {
                homeStore = jQueryBopis('#hc-home-store');
                await displayStoresToSelect();
                initialiseBopis();
            });

        });
    } else {
        jQueryBopis = jQuery;
        jQuery(document).ready(async function() {
            homeStore = jQueryBopis('#hc-home-store');
            await displayStoresToSelect();
            initialiseBopis();
        });
    }

    // function will open the modal for the stores information
    function openStoreModal (event) {
        const eventTarget = jQueryBopis(event.target);

        // to stop event bubbling when clicking on the Check Stores button
        event.preventDefault();
        event.stopImmediatePropagation();

        dropdownBackdrop = jQueryBopis('<div id="hc-dropdown-backdrop"></div>');
        jQueryBopis("body").append(dropdownBackdrop);

        jQueryBopis('#hc-home-store i').remove();
        const caretUpIcon = jQueryBopis('<i class="fa fa-caret-up hc-caret-icon"></i>')
        homeStore.append(caretUpIcon);

        // add overflow style to disable background scroll when modal is opened
        jQueryBopis("body").css("overflow", "hidden");
        jQueryBopis(".hc-store-dropdown")[0].style.display = "block";
    }

    function closeStoreModal () {
        jQueryBopis('#hc-home-store i').remove();
        const caretDownIcon = jQueryBopis('<i class="fa fa-caret-down hc-caret-icon"></i>')
        homeStore.append(caretDownIcon);
        jQueryBopis(".hc-store-dropdown")[0].style.display = "none";
        jQueryBopis("body").css("overflow", "scroll");
        dropdownBackdrop.remove();
    }

    function displayStoresInDropdown() {
        if (jQueryBopis('.hc-caret-icon').length == 0) {
            const caretDownIcon = jQueryBopis('<i class="fa fa-caret-down hc-caret-icon"></i>')
            homeStore.append(caretDownIcon); 
        }

        const currentStore = getUserStorePreference();
        const userHomeStore = stores.response.docs.find((store) => store.storeCode === currentStore);
        const otherStores = stores.response.docs.filter((store) => store.storeCode !== currentStore);

        jQueryBopis("#hc-store-dropdown") && jQueryBopis("#hc-store-dropdown").remove();

        let $storeDropdown = jQueryBopis(`<div id="hc-store-dropdown" class="hc-store-dropdown">
            <div class="hc-store-dropdown-content">
                <div class="hc-store-dropdown-information"></div>
            </div>
        </div>`);
  
        jQueryBopis("#hc-my-store-bopis").append($storeDropdown);

        if (userHomeStore) {
            jQueryBopis('#hc-home-store #store').text(userHomeStore.storeName);
            let $userHomeStoreTitle = jQueryBopis('<h2 class="hc-store-dropdown-title">Home Store:</h2>');
            jQueryBopis('.hc-store-dropdown-information').append($userHomeStoreTitle);
  
            let $storeDropdownCard = jQueryBopis('<div id="hc-store-dropdown-card"></div>');
            let $storeInformationCard = jQueryBopis(`
            <div id="hc-store-dropdown-details">
                <div id="hc-store-dropdown-details-column"><h4 class="hc-store-title">${userHomeStore.storeName ? userHomeStore.storeName : ''}</h4><p>${userHomeStore.address1 ? userHomeStore.address1 : ''}</p><p>${userHomeStore.city ? userHomeStore.city : ''}${userHomeStore.stateCode ? `, ${userHomeStore.stateCode}` : ''}${userHomeStore.postalCode ? `, ${userHomeStore.postalCode}` : ''}${userHomeStore.countryCode ? `, ${userHomeStore.countryCode}` : ''}</p></div>
                <div id="hc-store-dropdown-details-column"><p>${userHomeStore.storePhone ? userHomeStore.storePhone : ''}</p><p>${ userHomeStore.regularHours ? 'Open Today: ' + tConvert(openData(userHomeStore.regularHours).openTime) + ' - ': ''} ${userHomeStore.regularHours ? tConvert(openData(userHomeStore.regularHours).closeTime) : ''}</p></div>
            </div>`);
            
            $storeDropdownCard.append($storeInformationCard);
  
            let $lineBreak = jQueryBopis('<hr/>')
            $storeDropdownCard.append($lineBreak);
  
            jQueryBopis('.hc-store-dropdown-information').append($storeDropdownCard);
        }

        if (otherStores.length) {
          let $otherStoresTitle = jQueryBopis('<h2 class="hc-store-dropdown-title">Other Stores:</h2>');
          jQueryBopis('.hc-store-dropdown-information').append($otherStoresTitle);
        }

        otherStores.map((store) => {
          let $storeDropdownCard = jQueryBopis('<div id="hc-store-dropdown-card"></div>');
          let $storeInformationCard = jQueryBopis(`
          <div id="hc-store-dropdown-details">
              <div id="hc-store-dropdown-details-column"><h4 class="hc-store-title">${store.storeName ? store.storeName : ''}</h4><p>${store.address1 ? store.address1 : ''}</p><p>${store.city ? store.city : ''}${store.stateCode ? `, ${store.stateCode}` : ''}${store.postalCode ? `, ${store.postalCode}` : ''}${store.countryCode ? `, ${store.countryCode}` : ''}</p></div>
              <div id="hc-store-dropdown-details-column"><p>${store.storePhone ? store.storePhone : ''}</p><p>${ store.regularHours ? 'Open Today: ' + tConvert(openData(store.regularHours).openTime) + ' - ': ''} ${store.regularHours ? tConvert(openData(store.regularHours).closeTime) : ''}</p></div>
          </div>`);

          let $setAsHomeStoreButton = jQueryBopis('<div class="hc-home-store-dropdown-button hc-pointer">SET AS HOME STORE</div>');
          $setAsHomeStoreButton.on("click", setUserStorePreference.bind(null, store.storeCode));
          
          $storeDropdownCard.append($storeInformationCard);
          $storeDropdownCard.append($setAsHomeStoreButton);

          let $lineBreak = jQueryBopis('<hr/>')
          $storeDropdownCard.append($lineBreak);

          jQueryBopis('.hc-store-dropdown-information').append($storeDropdownCard);
        })
    }

    async function displayStoresToSelect() {
      stores = await getStoreInformation().then(data => data).catch(err => err);

      if (stores && stores.response?.numFound > 0) {
        displayStoresInDropdown();
      }

      const hcHomeStoreChange = jQueryBopis('#hc-home-store');
      hcHomeStoreChange.on('click', openStoreModal);
    };

    // function to get co-ordinates of the user after successfully getting the location
    function locationSuccess (pos) {
        $location = pos.coords;
    }

    // function to display error on console if having any error when getting the location
    function locationError (err) {
        console.error(err.code, err.message);
    }

    // will fetch the current location of the user
    function getCurrentLocation () {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError);
    }

    // function will open the inline store selector for the bopis
    function openBopisSelectorInline (event) {
        // to stop event bubbling when clicking on the button
        event.preventDefault();
        event.stopImmediatePropagation();

        jQueryBopis('.hc-store-change-button').each(function (i, button) {
          const btn = jQueryBopis(button)
          btn.off('click', openBopisSelectorInline);
          btn.on('click', closeBopisSelectorInline);
          btn.text('Hide Other Stores');
        });

        jQueryBopis(".hc-store-information-pdp") && (jQueryBopis(".hc-store-information-pdp")[0].style.display = "inline");
    }

    function closeBopisSelectorInline () {
        jQueryBopis('.hc-store-change-button').each(function (i, button) {
            const btn = jQueryBopis(button)
            btn.off('click', closeBopisSelectorInline);
            btn.on('click', openBopisSelectorInline);
            btn.text('Check Other Stores');
        });
      
        jQueryBopis(".hc-store-information-pdp") && (jQueryBopis(".hc-store-information-pdp")[0].style.display = "none");
    }

    async function getCurrentProduct() {
        await jQueryBopis.getJSON(`${window.location.pathname}.js`, function(product) {
            currentProduct = product;
        });
    }

    async function isProductAvailable(variantSku) {
        const hasInventoryOnShopify = jQueryBopis("input[class='hc_inventory']").val() > 0
        if (currentProduct && hasInventoryOnShopify) {
            return true;
        }
        return false;
    }

    function getUserStorePreference() {
        return localStorage.getItem('hcCurrentStore');
    }

    function updateCurrentStoreInformation() {
      const currentStoreCode = getUserStorePreference();
      const currentStore = stores?.response?.docs?.find((store) => store.storeCode == currentStoreCode) ?? 'No Store selected';
      jQueryBopis('#hc-current-store') && jQueryBopis('#hc-current-store').text(currentStore?.storeName);

      // Iterating over current-store-pdp elements as we have two occurances of this class in DOM and thus
      // need to update both of them when store changes
      jQueryBopis('.hc-current-store-pdp') && jQueryBopis('.hc-current-store-pdp').each(function (i, field) {
        jQueryBopis(field).text(currentStore?.storeName)
      });

      if (!currentStoreCode) {
          jQueryBopis('#hc-current-store-information-no-store')[0].style.display = 'flex';
      }
      
      result && displayStoreInformation(result);
      if (storesWithInventory && currentStoreCode) {
          const hasInventory = storesWithInventory.some((store) => store.facilityId === currentStoreCode && store.atp > 0);
          if (hasInventory) {
              jQueryBopis('#hc-current-store-information-out-of-stock')[0].style.display = 'none';
              jQueryBopis('#hc-current-store-information-in-stock')[0].style.display = 'flex';
          } else {
              jQueryBopis('#hc-current-store-information-out-of-stock')[0].style.display = 'flex';
              jQueryBopis('#hc-current-store-information-in-stock')[0].style.display = 'none';
          }
          jQueryBopis('#hc-current-store-information-no-store')[0].style.display = 'none';
      }
    }

    function setUserStorePreference(storeCode, event) {
        localStorage.setItem('hcCurrentStore', storeCode);
        updateCurrentStoreInformation();
        displayStoresInDropdown();
        const eventTargetClass = jQueryBopis(event.target)[0].className;
        if (eventTargetClass.includes("hc-home-store-pdp-button")) {
            closeBopisSelectorInline();
        } else if (eventTargetClass.includes("hc-home-store-dropdown-button")) {
            closeStoreModal();
        }
    }

    async function initialiseBopis () {
        jQueryBopis("body").on('click', function(event) {
            if (event.target == jQueryBopis("#hc-bopis-modal")[0]) {
                closeBopisModal();
            } else if (event.target == jQueryBopis("#hc-dropdown-backdrop")[0]) {
                closeStoreModal();
            }
        })
        if (location.pathname.includes('products')) {
            // Add this to always hide the bopis selector on PDP for initial page load, or variant change
            closeBopisSelectorInline();
            await getCurrentProduct(); // fetch the information for the current product
            await getCurrentLocation();

            // jQueryBopis(".hc-store-information-pdp").remove();

            const cartForm = jQueryBopis(".hc-product-form");
            const sku = jQueryBopis(".hc_product_sku").text() ? jQueryBopis(".hc_product_sku").text() : jQueryBopis(".hc_product_sku").val();

            const bopisButton = jQueryBopis("#hc-bopis-store-information");
            const bopisButtonEnabled = jQueryBopis(".hc-bopis-button-pdp");

            // Do not enable BOPIS when the current product is not available
            if(!(await isProductAvailable(sku))) {
              bopisButton[0].style.display = 'none';
              return;
            }

            updateCurrentStoreInformation();

            const hcStoreChangeButton = jQueryBopis('.hc-store-change-button').each(function (i, button) { jQueryBopis(button).on('click', openBopisSelectorInline) });
            bopisButtonEnabled.on('click', updateCartWithCurrentStore);

            jQueryBopis(".hc-bopis-pick-up-button").on('click', handleAddToCartEvent);
            // jQueryBopis("body").on('click', function(event) {
            //     console.log('clicked body');
            //     if (event.target == jQueryBopis("#hc-bopis-modal")[0]) {
            //         closeBopisModal();
            //     }
            // })

            handleAddToCartEvent();

        } else if(location.pathname.includes('cart')) {
            // finding this property on cart page as some themes may display hidden properties on cart page
            jQueryBopis("[data-cart-item-property-name]:contains('pickupstore')").closest('li').hide();
        }
    }

    function updateCartWithCurrentStore() {

        const currentStoreCode = getUserStorePreference();
        const store = stores?.response?.docs?.find((store) => store.storeCode == currentStoreCode);

        let addToCartForm = jQueryBopis(".hc-product-form");

        event.preventDefault();
        event.stopImmediatePropagation();

        // let merchant define the behavior whenever pick up button is clicked, merchant can define an event listener for this event
        jQueryBopis(document).trigger('prePickUp');

        // made the property hidden by adding underscore before the property name
        let facilityIdInput = jQueryBopis(`<input id="hc-store-code" name="properties[_pickupstore]" value=${store.storeCode ? store.storeCode : ''} type="hidden"/>`)
        addToCartForm.append(facilityIdInput)

        let facilityNameInput = jQueryBopis(`<input id="hc-pickupstore-address" name="properties[Pickup Store]" value="${store.storeName ? store.storeName : ''} ${store.address1 ? `, ${store.address1}` : ''} ${store.city ? `, ${store.city}` : ''}" type="hidden"/>`)
        addToCartForm.append(facilityNameInput)

        // using the cart add endpoint to add the product to cart, as using the theme specific methods is not recommended.
        jQueryBopis.ajax({
            type: "POST",
            url: '/cart/add.js',
            data: addToCartForm.serialize(),
            dataType: 'JSON',
            success: function () {

                // let merchant define the behavior after the item is successfully added as a pick up item, merchant can define an event listener for this event
                jQueryBopis(document).trigger('postPickUp');

                // redirecting the user to the cart page after the product gets added to the cart
                if (bopisCustomConfig.enableCartRedirection) {
                    location.replace('/cart');
                }
            }
        })

        facilityIdInput.remove();
        facilityNameInput.remove();
    }

    function getStoreInformation (queryString) {
        const payload = {
            viewSize: 100,
            keyword: queryString
        }

        if ($location) {
            payload["distance"] = 50
            payload["point"] = `${$location.latitude}, ${$location.longitude}`
        }

        // applied a condition that if we have location permission then searching the stores for the current location
        // if we have both location and pin, then using the pin to search for stores
        // if we doesn't have location permission and pin, then will fetch all the available stores
        return new Promise(function(resolve, reject) {
            jQueryBopis.ajax({
                type: 'POST',
                url: `${baseUrl}/api/storeLookup`,
                crossDomain: true,
                data: payload,
                success: function (res) {
                    resolve(res)
                },
                error: function (err, textStatus) {
                    reject(textStatus);
                }
            })
        })
    }

    async function checkInventory(payload) {

        // this will create a url param like &facilityId=store_1&facilityId=store_1 which is then sent
        // with the url, used this approach as unable to send array in the url params and also unable to
        // pass body as the request type is GET.
        let paramFacilityId = '';
        payload[0].facilityId.map((facility) => {
            paramFacilityId += `&facilityId=${facility}`
        })
        const viewSize = payload[0].facilityId.length

        let resp;

        // added try catch to handle network related errors
        try {
            resp = await new Promise(function(resolve, reject) {
                jQueryBopis.ajax({
                    type: 'GET',
                    url: `${baseUrl}/api/checkInventory?sku=${payload[0].sku}${paramFacilityId}&viewSize=${viewSize}`,
                    crossDomain: true,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    success: function (data) {
                        resolve(data);
                    },
                    error: function (xhr, textStatus, exception) {
                        reject(textStatus)
                    }
                })
            })
        } catch (err) {
            resp = err;
        }
        return resp;
    }
    
    async function handleAddToCartEvent(event) {

        let eventTarget;
        if (event) {
            eventTarget = jQueryBopis(event.target);
            // to stop event bubbling when clicking on the Check Stores button
            event.preventDefault();
            event.stopImmediatePropagation();
        }

        const queryString = jQueryBopis("#hc-bopis-store-pin").val();
        let storeInformation = queryString || $location ? await getStoreInformation(queryString).then(data => data).catch(err => err) : stores;

        const sku = jQueryBopis(".hc_product_sku").text() ? jQueryBopis(".hc_product_sku").text() : jQueryBopis(".hc_product_sku").val();

        jQueryBopis('#hc-store-card').remove();
        if (event) eventTarget.prop("disabled", true);

        // checking if the number of stores is greater then 0 then creating a payload to check inventory
        if (storeInformation && storeInformation.response && storeInformation.response.numFound > 0) {

            let storeCodes = storeInformation.response.docs.map((store) => {
                let storeCode = '';

                // if storeCode starts with DC_ then removing the code
                if (store.storeCode.startsWith('DC_')) {
                    storeCode = store.storeCode.substring(3);
                } else {
                    storeCode = store.storeCode;
                }

                store.storeCode = storeCode;
                return storeCode;
            })

            // passing the facilityId as an array in the payload
            let payload = [{"sku" : sku, "facilityId": storeCodes}];
            result = await checkInventory(payload)

            // mapping the inventory result with the locations to filter those stores whose inventory
            // is present and the store code is present in the locations.
            if (result.docs) {
                storesWithInventory = result.docs;
                result = storeInformation.response.docs.filter((location) => {
                    return result.docs.some((doc) => {
                        return doc.facilityId === location.storeCode && doc.atp > 0;
                    })
                })

                updateCurrentStoreInformation();
            }
        }

        displayStoreInformation(result)
        if (event) eventTarget.prop("disabled", false);
    }

    function getDay () {
        let days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        let date = new Date();
        let dayName = days[date.getDay()];
        return dayName;
    }

    function openData (regularHours) {
        return regularHours.periods.find(period => period.openDay === getDay());
    }

    function tConvert (time) {
        if (time) {
            // Check correct time format and split into components
            time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
    
            if (time.length > 1) { // If time format correct
                time = time.slice(1); // Remove full string match value
                time[5] = +time[0] < 12 ? 'am' : 'pm'; // Set AM/PM
                time[0] = +time[0] % 12 || 12; // Adjust hours
            }
            return time.join(''); // return adjusted time or original string
        }
    }

    // will check for the inventory for the product stock and if available then display the information on the UI
    function displayStoreInformation(result) {
        jQueryBopis('.hc-store-information-pdp').empty();
        // TODO Handle it in a better way
        // The content of error is not removed and appended to last error message
        // jQueryBopis('.hc-store-not-found').remove();
        // jQueryBopis('.hc-modal-content').append(jQueryBopis('<p class="hc-store-not-found"></p>'));
        const hcModalContent = jQueryBopis('.hc-modal-content')
    
        //check for result count, result count contains the number of stores count in result
        //TODO: find a better approach to handle the error secenario
        if (result.length > 0 && !result.includes('error')) {
            const currentStore = getUserStorePreference();
            const userHomeStore = stores && stores.response && stores.response.numFound && stores.response.docs.find((store) => store.storeCode === currentStore);
            const userHomeStoreHasInventory = result.some((store) => store.storeCode === currentStore)
            const otherStores = result.filter((store) => store.storeCode !== currentStore);
                
            if (userHomeStore) {
                jQueryBopis('.hc-store-information-pdp').append('<hr/><span>My Home Store:</span>')
                let $storeCard = jQueryBopis('<div id="hc-store-card"></div>');
                let $storeInformationCard = jQueryBopis(`
                <div id="hc-store-details">
                    <div id="hc-details-column"><h4 class="hc-store-title">${userHomeStore.storeName ? userHomeStore.storeName : ''}</h4><p>${userHomeStore.address1 ? userHomeStore.address1 : ''}</p><p>${userHomeStore.city ? userHomeStore.city : ''}</p><p>${userHomeStore.storePhone ? userHomeStore.storePhone : ''}</p><p>${ userHomeStore.regularHours ? 'Open Today: ' + tConvert(openData(userHomeStore.regularHours).openTime) + ' - ': ''} ${userHomeStore.regularHours ? tConvert(openData(userHomeStore.regularHours).closeTime) : ''}</p></div>
                    <div id="hc-details-column" style="flex-shrink: 0; text-align: end;"><p class="hc-text-uppercase" style="color: #529058;">${userHomeStoreHasInventory ? 'In stock' : ''}</p></div>
                </div>`);

                $storeCard.append($storeInformationCard);

                jQueryBopis('.hc-store-information-pdp').append($storeCard);
            }

            if (otherStores.length) {
                jQueryBopis('.hc-store-information-pdp').append(`<hr/><span>${currentStore ? 'Other Stores:' : 'Select a Store:'}</span>`)
                otherStores.map((store) => {
                    let $storeCard = jQueryBopis('<div id="hc-store-card"></div>');
                    let $storeInformationCard = jQueryBopis(`
                    <div id="hc-store-details">
                        <div id="hc-details-column"><h4 class="hc-store-title">${store.storeName ? store.storeName : ''}</h4><p>${store.address1 ? store.address1 : ''}</p><p>${store.city ? store.city : ''}</p><p>${store.storePhone ? store.storePhone : ''}</p><p>${ store.regularHours ? 'Open Today: ' + tConvert(openData(store.regularHours).openTime) + ' - ': ''} ${store.regularHours ? tConvert(openData(store.regularHours).closeTime) : ''}</p></div>
                        <div id="hc-details-column" style="flex-shrink: 0; text-align: end;"><p class="hc-store-pick-up-button hc-pointer hc-text-uppercase" style="color: #2A64C5;">Pick up today</p><p class="hc-text-uppercase" style="color: #529058;">In stock</p></div>
                    </div>`);
    
                    let $myStoreButton = jQueryBopis('<div class="hc-home-store-pdp-button hc-pointer hc-text-uppercase">SET AS HOME STORE</div>');
                    $myStoreButton.on("click", setUserStorePreference.bind(null, store.storeCode));
    
                    let $lineBreak = jQueryBopis('<hr/>')

                    $storeCard.append($storeInformationCard);
                    $storeCard.append($myStoreButton);
                    $storeCard.append($lineBreak);
    
                    jQueryBopis('.hc-store-information-pdp').append($storeCard);

                    let $pickUpButton = jQueryBopis('.hc-store-pick-up-button');
                    $pickUpButton.on("click", updateCart.bind(null, store));
                })
            }
        } else {
            jQueryBopis('.hc-store-information-pdp').append('No stores found for this product');
        }

        // hide all the h4 and p tags which are empty in the modal
        hcModalContent.find('h4:empty').hide();
        hcModalContent.find('p:empty').hide();
    }
    
    // will add product to cart with a custom property pickupstore
    function updateCart(store, event) {

        let addToCartForm = jQueryBopis(".hc-product-form");

        event.preventDefault();
        event.stopImmediatePropagation();
                
        // let merchant define the behavior whenever pick up button is clicked, merchant can define an event listener for this event
        jQueryBopis(document).trigger('prePickUp');

        // made the property hidden by adding underscore before the property name
        let facilityIdInput = jQueryBopis(`<input id="hc-store-code" name="properties[_pickupstore]" value=${store.storeCode ? store.storeCode : ''} type="hidden"/>`)
        addToCartForm.append(facilityIdInput)

        let facilityNameInput = jQueryBopis(`<input id="hc-pickupstore-address" name="properties[Pickup Store]" value="${store.storeName ? store.storeName : ''} ${store.address1 ? `, ${store.address1}` : ''} ${store.city ? `, ${store.city}` : ''}" type="hidden"/>`)
        addToCartForm.append(facilityNameInput)

        // using the cart add endpoint to add the product to cart, as using the theme specific methods is not recommended.
        jQueryBopis.ajax({
            type: "POST",
            url: '/cart/add.js',
            data: addToCartForm.serialize(),
            dataType: 'JSON',
            success: function () {

                // let merchant define the behavior after the item is successfully added as a pick up item, merchant can define an event listener for this event
                jQueryBopis(document).trigger('postPickUp');

                // redirecting the user to the cart page after the product gets added to the cart
                if (bopisCustomConfig.enableCartRedirection) {
                    location.replace('/cart');
                }
            }
        })

        facilityIdInput.remove();
        facilityNameInput.remove();
    }
    // TODO move it to intialise block
    // To check whether the url has changed or not, for making sure that the variant is changed.
    let url = location.href; 
    new MutationObserver(async () => {
        if (location.href !== url) {
            url = location.href;
            updateCurrentStoreInformation();
            initialiseBopis();
        }
        // added condition to run the script again as when removing a product the script does not run
        // and thus the store id again becomes visible
        if (location.pathname.includes('cart')) initialiseBopis();
    }).observe(document, {subtree: true, childList: true});

})();