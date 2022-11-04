(function () {
    let jQueryBopis, $location, dropdownBackdrop, variantSku, stores, storesWithInventory, productId, homeStore, result, customerId, shopId;

    // defining a global object having properties which let merchant configure some behavior
    this.bopisCustomConfig = {
        'enableCartRedirection': 'false',
        'openMiniCart': 'true',
        ...this.bopisCustomConfig
    };

    // stored mapping as we are not getting correct store name in the response
    let storeNameMapping = {

    }

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

    if ((typeof jQuery === 'undefined') || (parseFloat(jQuery.fn['jquery']) < 3.2)) {
        loadScript('//ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js', async function(){
            jQueryBopis = jQuery.noConflict(true);
            jQueryBopis(document).ready(async function() {
                $location = await getCurrentLocation().then(pos => pos.coords).catch(err => console.error(err.message));
                shopId = JSON.parse(jQueryBopis('#shopify-features').text()).shopId;
                homeStore = jQueryBopis('#hc-home-store');
                await displayStoresToSelect();
                initialiseBopis();
            });

        });
    } else {
        jQueryBopis = jQuery;
        jQueryBopis(document).ready(async function() {
            $location = await getCurrentLocation().then(pos => pos.coords).catch(err => console.error(err.message));
            shopId = JSON.parse(jQueryBopis('#shopify-features').text()).shopId;
            homeStore = jQueryBopis('#hc-home-store');
            await displayStoresToSelect();
            initialiseBopis();
        });
    }

    // function returns the name of the store
    // If we have primaryShopifyShopId for a store then checking for current shop and primaryShop and generating
    // store name on the basis of the condition
    function getStoreName(store) {
        let primaryShopifyShopName = '';
        let primaryShopifyShopId = store.primaryShopifyShopId;

        if (primaryShopifyShopId && primaryShopifyShopId != shopId && store.shopifyShops) {
            primaryShopifyShopName = store.primaryFacilityGroupName
        }
        const storeName = store.storeName ? primaryShopifyShopName ? store.storeName + '<br/><span class="hc-font-s hc-featuring-store"> ' + primaryShopifyShopName + ' featuring ' + storeNameMapping[shopId] + '</span>' : store.storeName : ''
        return storeName;
    }

    function getStoreDistance(store) {
        // used parseFloat as toFixed returns a string and thus toLocaleString method does not work
        return store.dist ? parseFloat((store.dist).toFixed(1)).toLocaleString() + ' mi' : ''
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
        const caretUpIcon = jQueryBopis('<i class="fa fa-caret-up hc-caret-icon" style="cursor: pointer;"></i>')
        homeStore.append(caretUpIcon);

        // add overflow style to disable background scroll when modal is opened
        jQueryBopis("body").css("overflow", "hidden");
        jQueryBopis(".hc-store-dropdown")[0].style.display = "block";
    }

    function closeStoreModal () {
        jQueryBopis('#hc-home-store i').remove();
        const caretDownIcon = jQueryBopis('<i class="fa fa-caret-down hc-caret-icon" style="cursor: pointer;"></i>')
        homeStore.append(caretDownIcon);
        jQueryBopis(".hc-store-dropdown")[0].style.display = "none";
        jQueryBopis("body").css("overflow", "scroll");
        jQueryBopis("#hc-dropdown-backdrop").remove();
    }

    function displayStoresInDropdown() {
        if (jQueryBopis('.hc-caret-icon').length == 0) {
            const caretDownIcon = jQueryBopis('<i class="fa fa-caret-down hc-caret-icon" style="cursor: pointer;"></i>')
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
            const homeStoreName = userHomeStore.storeName + ' ' + (openData(userHomeStore.timings).open && openData(userHomeStore.timings).close ? `(Open from ${openData(userHomeStore.timings).open} to ${openData(userHomeStore.timings).close})` : '(Closed Today)')
            jQueryBopis('#hc-home-store #store').text(homeStoreName);
            let $userHomeStoreTitle = jQueryBopis('<h2 class="hc-store-dropdown-title hc-font-xl">My Store:</h2>');
            jQueryBopis('.hc-store-dropdown-information').append($userHomeStoreTitle);

            let $storeDropdownCard = jQueryBopis('<div id="hc-store-dropdown-card"></div>');
            let $storeInformationCard = jQueryBopis(`
            <div class="hc-store-title"><h4 class="hc-font-m">${getStoreName(userHomeStore)}</h4>
                <span>${getStoreDistance(userHomeStore)}</span>
            </div>
            <div id="hc-store-dropdown-details">
                <div id="hc-store-dropdown-details-column"><p>${userHomeStore.address1 ? userHomeStore.address1 : ''}</p><p>${userHomeStore.city ? userHomeStore.city : ''}${userHomeStore.stateCode ? `, ${userHomeStore.stateCode}` : ''}${userHomeStore.postalCode ? `, ${userHomeStore.postalCode}` : ''}${userHomeStore.countryCode ? `, ${userHomeStore.countryCode}` : ''}</p></div>
                <div id="hc-store-dropdown-details-column"><p>${userHomeStore.storePhone ? userHomeStore.storePhone : ''}</p><p>${ openData(userHomeStore.timings).open ? 'Open Today: ' + openData(userHomeStore.timings).open + ' - ': ''} ${ openData(userHomeStore.timings).close ? openData(userHomeStore.timings).close : ''}</p></div>
            </div>`);

            // created div as directly adding timing in card resulting in distorted UI, due to overriding the style
            // from the theme
            // let $storeActions = jQueryBopis('<div id="hc-store-actions" style="margin-top: 10px"></div>')

            // let storeWeeklyTiming = ''
            // Object.entries(getWeeklyStoreTimings(userHomeStore.timings)).map(([day, timing]) => storeWeeklyTiming += `<p>${day}: ${timing}</p>`)

            // const storeTiming = jQueryBopis(`
            //     <div id="hc-store-timings">
            //         <p>Store Hours: </p>${storeWeeklyTiming}
            //     </div>
            // `);

            // $storeActions.append(storeTiming);

            $storeDropdownCard.append($storeInformationCard);
            // $storeDropdownCard.append($storeActions);
  
            let $lineBreak = jQueryBopis('<hr/>')
            $storeDropdownCard.append($lineBreak);
  
            jQueryBopis('.hc-store-dropdown-information').append($storeDropdownCard);
        }

        if (otherStores.length) {
            let $otherStoresTitle = jQueryBopis(`<h2 class="hc-store-dropdown-title hc-font-xl">${userHomeStore ? 'Other Stores:' : 'Select a Store'}</h2>`);
            jQueryBopis('.hc-store-dropdown-information').append($otherStoresTitle);
        }

        otherStores.map((store) => {
            let $storeDropdownCard = jQueryBopis('<div id="hc-store-dropdown-card"></div>');
            let $storeInformationCard = jQueryBopis(`
            <div class="hc-store-title"><h4 class="hc-font-m">${getStoreName(store)}</h4>
                <span>${getStoreDistance(store)}</span>
            </div>
            <div id="hc-store-dropdown-details">
                <div id="hc-store-dropdown-details-column"><p>${store.address1 ? store.address1 : ''}</p><p>${store.city ? store.city : ''}${store.stateCode ? `, ${store.stateCode}` : ''}${store.postalCode ? `, ${store.postalCode}` : ''}${store.countryCode ? `, ${store.countryCode}` : ''}</p></div>
                <div id="hc-store-dropdown-details-column"><p>${store.storePhone ? store.storePhone : ''}</p><p>${ openData(store.timings).open ? 'Open Today: ' + openData(store.timings).open + ' - ': ''} ${ openData(store.timings).close ? openData(store.timings).close : ''}</p></div>
            </div>`);

            // let $storeActions = jQueryBopis('<div id="hc-store-actions" style="margin-top: 10px;"></div>')

            let $setAsHomeStoreButton = jQueryBopis('<div class="hc-home-store-dropdown-button hc-pointer" style="color: #C59A2A">SET AS MY STORE</div>');
            $setAsHomeStoreButton.on("click", setUserStorePreference.bind(null, store));

            // let storeWeeklyTiming = ''
            // Object.entries(getWeeklyStoreTimings(store.timings)).map(([day, timing]) => storeWeeklyTiming += `<p>${day}: ${timing}</p>`)

            // const storeTiming = jQueryBopis(`
            //     <p>Store Hours: </p>
            //     <div id="hc-store-timings">
            //         ${storeWeeklyTiming}
            //     </div>
            // `);

            // $storeActions.append(storeTiming);
            // $storeActions.append($setAsHomeStoreButton);

            $storeDropdownCard.append($storeInformationCard);
            $storeDropdownCard.append($setAsHomeStoreButton);

            let $lineBreak = jQueryBopis('<hr/>')
            $storeDropdownCard.append($lineBreak);

            jQueryBopis('.hc-store-dropdown-information').append($storeDropdownCard);
        })
    }

    async function displayStoresToSelect() {
        stores = await getStoreInformation().then(data => data).catch(err => err);

        if (stores && stores.response && stores.response.numFound > 0) {
            stores.response.docs.map((store) => {
                store.timings = getStoreTiming(store);
            })
            displayStoresInDropdown();
        }

        const hcHomeStoreChange = jQueryBopis('#hc-home-store');
        hcHomeStoreChange.on('click', openStoreModal);
    };

    // will fetch the current location of the user
    function getCurrentLocation () {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        })
    }

    // function will open the inline store selector for the bopis
    function openBopisSelectorInline (event) {
        // to stop event bubbling when clicking on the button
        event.preventDefault();
        event.stopImmediatePropagation();

        const currentStore = getUserStorePreference();
        jQueryBopis(`.hc-store-change-button-${productId}`).each(function (i, button) {
          const btn = jQueryBopis(button)
          btn.off('click', openBopisSelectorInline);
          btn.on('click', closeBopisSelectorInline);
          btn.text(currentStore ? 'Hide Other Stores' : 'Hide Stores');
        });

        jQueryBopis(`.hc-store-information-pdp-${productId}`) && (jQueryBopis(`.hc-store-information-pdp-${productId}`)[0].style.display = "inline");
    }

    function closeBopisSelectorInline () {
        const currentStore = getUserStorePreference();
        jQueryBopis(`.hc-store-change-button-${productId}`).each(function (i, button) {
            const btn = jQueryBopis(button)
            btn.off('click', closeBopisSelectorInline);
            btn.on('click', openBopisSelectorInline);
            btn.text(currentStore ? 'Check Other Stores' : 'Select a Store');
        });

        jQueryBopis(`.hc-store-information-pdp-${productId}`) && (jQueryBopis(`.hc-store-information-pdp-${productId}`)[0].style.display = "none");
    }

    function getUserStorePreference() {
        return localStorage.getItem('HC_CURRENT_STORE') ? localStorage.getItem('HC_CURRENT_STORE') : '';
    }

    function updateCurrentStoreInformation() {
        const currentStoreCode = getUserStorePreference();
        const currentStore = stores && stores.response && stores.response.docs.find((store) => store.storeCode == currentStoreCode) ? stores.response.docs.find((store) => store.storeCode == currentStoreCode) : 'No Store selected';
        localStorage.setItem('HC_CURRENT_STORE_NAME', currentStore.storeName);
        localStorage.setItem('HC_CURRENT_STORE_LAT_LON', currentStore.latlon); // storing home store latLon in localStorage to use when fetching stores information on the basis of homeStore latLon
        if (productId) {
            if (currentStoreCode) {
                const homeStoreName = currentStore.storeName + ' ' + (openData(currentStore.timings).open && openData(currentStore.timings).close ? `(Open from ${openData(currentStore.timings).open} to ${openData(currentStore.timings).close})` : '(Closed Today)')
                jQueryBopis('#hc-home-store #store').text(homeStoreName);
                jQueryBopis(`#hc-current-store-${productId}`) && jQueryBopis(`#hc-current-store-${productId}`).text(currentStore.storeName);

                // Iterating over current-store-pdp elements as we have two occurances of this class in DOM and thus
                // need to update both of them when store changes
                jQueryBopis(`.hc-current-store-pdp-${productId}`) && jQueryBopis(`.hc-current-store-pdp-${productId}`).each(function (i, field) {
                    currentStore && jQueryBopis(field).text(currentStore.storeName)
                });
            }
            if (!currentStoreCode) {
                jQueryBopis(`#hc-current-store-information-no-store-${productId}`)[0].style.display = 'flex';
            }
            result && displayStoreInformation(result);
            if (storesWithInventory && currentStoreCode) {
                const hasInventory = storesWithInventory.some((store) => store.facilityId === currentStoreCode && store.atp > 0);
                if (hasInventory) {
                    jQueryBopis(`#hc-current-store-information-out-of-stock-${productId}`)[0].style.display = 'none';
                    jQueryBopis(`#hc-current-store-information-in-stock-${productId}`)[0].style.display = 'flex';
                } else {
                    jQueryBopis(`#hc-current-store-information-out-of-stock-${productId}`)[0].style.display = 'flex';
                    jQueryBopis(`#hc-current-store-information-in-stock-${productId}`)[0].style.display = 'none';
                }
                jQueryBopis(`#hc-current-store-information-no-store-${productId}`)[0].style.display = 'none';
            }
        }
    }

    async function setUserStorePreference(store, event) {
        localStorage.setItem('HC_CURRENT_STORE', store.storeCode);
        localStorage.setItem('HC_CURRENT_STORE_LAT_LON', store.latlon); // storing home store latLon in localStorage to use when fetching stores information on the basis of homeStore latLon

        if (customerId && shopId) {
            await setCustomerDefaultStore(store.storeCode);
        }

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
            // closeBopisSelectorInline();

            if (jQueryBopis('div[id^=ProductSection-]').length == 1) {
                productId = jQueryBopis('div[id^=ProductSection-]')[0].id.split('-')[1]
            } else {
                jQueryBopis('div[id^=ProductSection-]').each((index, section) => {

                    if(section.className.split(' ').includes('active')) {
                        productId = section.id.split('-')[1]
                        return;
                    }
                })
            }
            const variantId = jQueryBopis(`#ProductSelect-${productId}`).val();
            const variantInformation = JSON.parse(jQuery(`#HCProductInformation-${productId}`).text().replace(/\\n/g, ''));
            variantSku = variantInformation[variantId].sku;

            jQueryBopis(".hc-store-information").remove();
            jQueryBopis(".hc-bopis-modal").remove();

            const cartForm = jQueryBopis(".hc-product-form");
            const sku = variantSku;

            // Do not enable BOPIS when the current product is not available
            if(!variantInformation[variantId] || variantInformation[variantId].inventory <= 0) return;

            const bopisButton = jQueryBopis(`.hc-bopis-button-pdp-${productId}`);
            const bopisButtonEnabled = jQueryBopis(`.hc-bopis-button-pdp-${productId} > button`);

            // Do not enable BOPIS when the current product is not available
            // if(!(await isProductAvailable(sku))) {
            //     bopisButton[0].style.display = 'none';
            //     return;
            // }

            let $pickUpModal = jQueryBopis(`<div id="hc-bopis-modal" class="hc-bopis-modal">
                <div class="hc-modal-content">
                    <div class="hc-modal-header">
                        <span class="hc-close"></span>
                        <h1 class="hc-modal-title">Pick up today</h1>
                    </div>
                    <form id="hc-bopis-form">
                        <input id="hc-bopis-store-pin" name="pin" placeholder="Enter postcode"/>
                        <button type="submit" class="btn hc-bopis-pick-up-button">Find Stores</button>
                    </form>
                    <div class="hc-store-information"></div>
                    <p class="hc-store-not-found"></p>
                </div>
            </div>`);


            updateCurrentStoreInformation();

            jQueryBopis("body").append($pickUpModal);

            const hcStoreChangeButton = jQueryBopis(`.hc-store-change-button-${productId}`).each(function (i, button) { jQueryBopis(button).on('click', openBopisSelectorInline) });
            bopisButton.on('click', updateCartWithCurrentStore);

            jQueryBopis(".hc-bopis-pick-up-button").on('click', handleAddToCartEvent);

            handleAddToCartEvent();

        } else if(location.pathname.includes('cart')) {
            // finding this property on cart page as some themes may display hidden properties on cart page
            jQueryBopis && jQueryBopis("[data-cart-item-property-name]:contains('pickupstore')").closest('li').hide();
        }
    }

    function updateCartWithCurrentStore() {

        const currentStoreCode = getUserStorePreference();
        const store = stores.response.docs.find((store) => store.storeCode == currentStoreCode);

        let addToCartForm = jQueryBopis(`div[id='ProductSection-${productId}'] .hc-product-form`);

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
                } else if (bopisCustomConfig.openMiniCart){
                    bopisCustomConfig.onStorePickUp();
                }
            }
        })

        facilityIdInput.remove();
        facilityNameInput.remove();
    }

    function getStoreInformation (queryString) {
        const payload = {
            viewSize: 20,
            keyword: queryString,
            filters: ["storeType: RETAIL_STORE"]
        }

        // fetching home store latLon from localStorage
        const homeStoreLatLon = localStorage.getItem('HC_CURRENT_STORE_LAT_LON');

        // fetch stores on the basis of user's latlon if available otherwise use homeStore's location to fetch
        // stores
        if ($location) {
            payload["point"] = `${$location.latitude}, ${$location.longitude}`
        } else if (homeStoreLatLon && homeStoreLatLon !== 'undefined') {
            payload["point"] = homeStoreLatLon
        }

        if (shopId) {
            payload.filters.push(`shopifyShop_id: ${shopId}`)
        }

        // applied a condition that if we have location permission then searching the stores for the current location
        // if we have both location and pin, then using the pin to search for stores
        // if we doesn't have location permission and pin, then will fetch all the available stores
        return new Promise(function(resolve, reject) {
            jQueryBopis.ajax({
                type: 'POST',
                url: `${baseUrl}/api/storeLookup`,
                crossDomain: true,
                data: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                },
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

        const sku = variantSku;

        jQueryBopis('#hc-store-card').remove();
        if (event) eventTarget.prop("disabled", true);

        // checking if the number of stores is greater then 0 then creating a payload to check inventory
        if (storeInformation && storeInformation.response && storeInformation.response.numFound > 0) {

            let storeCodes = storeInformation.response.docs.map((store) => {

                // added this condition to handle the case when we will fetch specific stores for PDP page
                store.timings = store.timings ? store.timings : getStoreTiming(store);

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
            stores = storeInformation
            displayStoresInDropdown();
        } else { // assigning empty array to result variable when there are no stores found
            result = [];
        }

        displayStoreInformation(result)
        if (event) eventTarget.prop("disabled", false);
    }

    function getDay () {
        let days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let date = new Date();
        let dayName = days[date.getDay()];
        return dayName;
    }

    function openData (timing) {
        return timing[getDay()];
    }

    // function getWeeklyStoreTimings(timings) {
    //     let days = {'monday': 'Mon', 'tuesday': 'Tue', 'wednesday': 'Wed', 'thursday': 'Thu', 'friday': 'Fri', 'saturday': 'Sat', 'sunday': 'Sun'}
    //     let startDay = '';
    //     let endDay = '';
    //     let previousTime = '';
    //     const weeklyTiming = {};

    //     Object.keys(timings).map((day) => {
    //         // preparing time for a day
    //         const time = `${timings[day].open} - ${timings[day].close}`

    //         // if current time is not available in weeklyTime then add the day in weekly timing
    //         // Also checking that if we have startDay and
    //         // endDay already then adding that in the weeklyTime and making startDay and endDay again empty
    //         if (!weeklyTiming[time]) {
    //             startDay && endDay && weeklyTiming[previousTime].push(`${startDay} - ${endDay}`)
    //             startDay = endDay = '';

    //             weeklyTiming[time] = [days[day]];
    //             previousTime = time;
    //         } else {
    //             if (time === previousTime) {
    //                 startDay = startDay ? startDay : weeklyTiming[time].pop();
    //                 endDay = days[day];
    //             } else {
    //                 startDay && endDay && weeklyTiming[previousTime].push(`${startDay} - ${endDay}`)
    //                 weeklyTiming[time].push(days[day]);
    //                 previousTime = time;
    //                 startDay = endDay = '';
    //             }
    //         }
    //     })

    //     // if we have startDay and endDay then adding both in the weeklyTiming
    //     // This condition is written in order to handle the case when the last iteration and previous iteration
    //     // will have the same time
    //     startDay && endDay && weeklyTiming[previousTime].push(`${startDay} - ${endDay}`);

    //     return Object.keys(weeklyTiming).reduce((storeWeeklyTimings, timing) => {
    //         const days = weeklyTiming[timing];
    //         days.map((day) => storeWeeklyTimings[day] = timing);
    //         return storeWeeklyTimings;
    //     }, {})
    // }

    function tConvert (time) {
        if (time) {
            // Check correct time format and split into components
            time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
    
            if (time.length > 1) { // If time format correct
                time.pop(); // remove seconds from the time
                time = time.slice(1); // Remove full string match value
                time[5] = +time[0] < 12 ? 'am' : 'pm'; // Set AM/PM
                time[0] = +time[0] % 12 || 12; // Adjust hours
            }
            return time.join(''); // return adjusted time or original string
        }
    }

    // function returns the open and close timing for a store
    function getStoreTiming(store) {
        let days = {'monday': {}, 'tuesday': {}, 'wednesday': {}, 'thursday': {}, 'friday': {}, 'saturday': {}, 'sunday': {}};

        const storeTimingDays = Object.keys(store).filter((key) => key.includes('open') || key.includes('close'));

        return storeTimingDays.reduce((obj, key) => {
            const time = store[key];
            if (key.includes('open')) {
                obj[key.replace('_open', '')]['open'] = tConvert(time)
            }
            if (key.includes('close')) {
                obj[key.replace('_close', '')]['close'] = tConvert(time)
            }
            return obj;
        }, days)
    }

    // will check for the inventory for the product stock and if available then display the information on the UI
    function displayStoreInformation(result) {
        jQueryBopis(`.hc-store-information-pdp-${productId}`).empty();
        // TODO Handle it in a better way
        // The content of error is not removed and appended to last error message
        // jQueryBopis('.hc-store-not-found').remove();
        // jQueryBopis('.hc-modal-content').append(jQueryBopis('<p class="hc-store-not-found"></p>'));
        const hcModalContent = jQueryBopis('.hc-modal-content')
        const currentStore = getUserStorePreference();
        const userHomeStore = stores && stores.response && stores.response.numFound && stores.response.docs.find((store) => store.storeCode === currentStore);

        //check for result count, result count contains the number of stores count in result
        //TODO: find a better approach to handle the error secenario
        if (result && result.length > 0 && !result.includes('error')) {
            let storesToShow = 20; // adding this for now we will only be displaying first 10 stores having inventory with no infinite scroll / load more option
            const userHomeStoreHasInventory = result.some((store) => store.storeCode === currentStore)
            const otherStores = result.filter((store) => store.storeCode !== currentStore);

            if (userHomeStore) {
                storesToShow--;
                jQueryBopis(`.hc-store-information-pdp-${productId}`).append('<hr/><span class="hc-font-s">My Store:</span>')
                let $storeCard = jQueryBopis('<div id="hc-store-card"></div>');
                let $storeInformationCard = jQueryBopis(`
                <div class="hc-store-title"><h4 class="hc-font-m">${getStoreName(userHomeStore)}</h4>
                    <span>${getStoreDistance(userHomeStore)}</span>
                </div>
                <div id="hc-store-details">
                    <div id="hc-details-column"><p>${userHomeStore.address1 ? userHomeStore.address1 : ''}</p><p>${userHomeStore.city ? userHomeStore.city : ''}${userHomeStore.stateCode ? `, ${userHomeStore.stateCode}` : ''}</p><p>${userHomeStore.storePhone ? userHomeStore.storePhone : ''}</p><p>${ openData(userHomeStore.timings).open ? 'Open Today: ' + openData(userHomeStore.timings).open + ' - ': ''} ${openData(userHomeStore.timings).close ? openData(userHomeStore.timings).close : ''}</p></div>
                    <div id="hc-details-column" class="hc-font-m" style="flex-shrink: 0; text-align: end;"><p class="hc-text-uppercase" style="color: #529058;">${userHomeStoreHasInventory ? 'In stock' : ''}</p></div>
                </div>`);

                $storeCard.append($storeInformationCard);

                jQueryBopis(`.hc-store-information-pdp-${productId}`).append($storeCard);
            }

            if (otherStores.length) {
                jQueryBopis(`.hc-store-information-pdp-${productId}`).append(`<hr/><span class="hc-font-s">${currentStore ? 'Other Stores:' : 'Select a Store:'}</span>`)
                otherStores.map((store) => {
                    if (storesToShow > 0) {
                        let $storeCard = jQueryBopis('<div id="hc-store-card"></div>');
                        let $storeInformationCard = jQueryBopis(`
                        <div class="hc-store-title"><h4 class="hc-font-m">${getStoreName(store)}</h4>
                            <span>${getStoreDistance(store)}</span>
                        </div>
                        <div id="hc-store-details">
                            <div id="hc-details-column"><p>${store.address1 ? store.address1 : ''}</p><p>${store.city ? store.city : ''}${store.stateCode ? `, ${store.stateCode}` : ''}</p><p>${store.storePhone ? store.storePhone : ''}</p><p>${ openData(store.timings).open ? 'Open Today: ' + openData(store.timings).open + ' - ': ''} ${openData(store.timings).close ? openData(store.timings).close : ''}</p></div>
                            <div id="hc-details-column" class="hc-font-m" style="flex-shrink: 0; text-align: end;"><p class="hc-store-pick-up-button hc-pointer hc-text-uppercase" style="color: #2A64C5;">Pick up in store</p><p class="hc-text-uppercase" style="color: #529058;">In stock</p></div>
                        </div>`);

                        let $myStoreButton = jQueryBopis('<div class="hc-home-store-pdp-button hc-pointer hc-text-uppercase hc-font-s" style="color: #C59A2A">SET AS MY STORE</div>');
                        $myStoreButton.on("click", setUserStorePreference.bind(null, store));

                        let $lineBreak = jQueryBopis('<hr/>')

                        $storeCard.append($storeInformationCard);
                        $storeCard.append($myStoreButton);
                        $storeCard.append($lineBreak);

                        jQueryBopis(`.hc-store-information-pdp-${productId}`).append($storeCard);

                        let $pickUpButton = jQueryBopis('.hc-store-pick-up-button');
                        $pickUpButton.on("click", updateCart.bind(null, store));
                        storesToShow--;
                    }
                    return;
                })
            }
        } else {
            if (userHomeStore) {
                jQueryBopis(`.hc-store-information-pdp-${productId}`).append('<hr/><span class="hc-font-s">My Store:</span>')
                let $storeCard = jQueryBopis('<div id="hc-store-card"></div>');
                let $storeInformationCard = jQueryBopis(`
                <div class="hc-store-title"><h4 class="hc-font-m">${getStoreName(userHomeStore)}</h4>
                    <span>${getStoreDistance(userHomeStore)}</span>
                </div>
                <div id="hc-store-details">
                    <div id="hc-details-column"><p>${userHomeStore.address1 ? userHomeStore.address1 : ''}</p><p>${userHomeStore.city ? userHomeStore.city : ''}${userHomeStore.stateCode ? `, ${userHomeStore.stateCode}` : ''}</p><p>${userHomeStore.storePhone ? userHomeStore.storePhone : ''}</p><p>${ openData(userHomeStore.timings).open ? 'Open Today: ' + openData(userHomeStore.timings).open + ' - ': ''} ${openData(userHomeStore.timings).close ? openData(userHomeStore.timings).close : ''}</p></div>
                    <div id="hc-details-column" class="hc-font-m" style="flex-shrink: 0; text-align: end;" ></div>
                </div>`);

                $storeCard.append($storeInformationCard);

                jQueryBopis(`.hc-store-information-pdp-${productId}`).append($storeCard);
            }
            jQueryBopis(`.hc-store-information-pdp-${productId}`).append('<hr />');
            jQueryBopis(`.hc-store-information-pdp-${productId}`).append('No stores found for this product');
        }

        // hide all the h4 and p tags which are empty in the modal
        hcModalContent.find('h4:empty').hide();
        hcModalContent.find('p:empty').hide();
    }
    
    // will add product to cart with a custom property pickupstore
    function updateCart(store, event) {

        let addToCartForm = jQueryBopis(`div[id='ProductSection-${productId}'] .hc-product-form`);

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
                } else if (bopisCustomConfig.openMiniCart){
                    bopisCustomConfig.onStorePickUp();
                }
            }
        })

        facilityIdInput.remove();
        facilityNameInput.remove();
    }

    async function getCustomerPreferredStore() {
        let resp;

        // added try catch to handle network related errors
        try {
            resp = await new Promise(function(resolve, reject) {
                jQueryBopis.ajax({
                    type: 'GET',
                    url: `${baseUrl}/api/getShopifyCustomerDefaultStore?customerId=${customerId.toString()}&shopifyShopId=${shopId.toString()}`,
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

    async function setCustomerDefaultStore(facilityId) {
        const payload = {
            'customerId': customerId.toString(),
            'shopifyShopId': shopId.toString(),
            'facilityId': facilityId.toString()
        }

        let resp;

        // added try catch to handle network related errors
        try {
            resp = await new Promise(function(resolve, reject) {
                jQueryBopis.ajax({
                    type: 'POST',
                    url: `${baseUrl}/api/setShopifyCustomerDefaultStore`,
                    crossDomain: true,
                    data: JSON.stringify(payload),
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

    // TODO move it to intialise block
    // To check whether the url has changed or not, for making sure that the variant is changed.
    let url = location.href; 
    new MutationObserver(async () => {
        if (location.href !== url) {
            url = location.href;
            updateCurrentStoreInformation();
            initialiseBopis();
        }

        if (jQueryBopis && productId && jQueryBopis('div[id^=ProductSection-]').length > 1 && jQueryBopis(`div[id='ProductSection-${productId}']`) && jQueryBopis(`div[id='ProductSection-${productId}']`)[0] && !jQueryBopis(`div[id='ProductSection-${productId}']`)[0].className.split(' ').includes('active')) {
            productId = ''
            updateCurrentStoreInformation();
            initialiseBopis();
        }

        // checking if customer id is present in DOM
        // if the customerId in DOM is different from current customer id then fetch the preferred store
        if(jQueryBopis && jQueryBopis("#hc-customer-id").val() && jQueryBopis("#hc-customer-id").val() !== customerId) {
            customerId = jQueryBopis("#hc-customer-id").val();

            // added check for shopId as on initial load the shopify-features does not contain data and loads data after some specific time and thus checking for shopId again if shopId is not found initially
            if(!shopId) {
                shopId = JSON.parse(jQueryBopis('#shopify-features').text()).shopId;
            }

            if (customerId && shopId) {
                const customerStoreResp = await getCustomerPreferredStore();
                if (customerStoreResp.customer && customerStoreResp.customer.result === 'success') {
                    await localStorage.setItem('HC_CURRENT_STORE', customerStoreResp.customer.facilityId);
                    updateCurrentStoreInformation();
                } else if (customerStoreResp.customer && customerStoreResp.customer.result === 'error') {
                    const currentStoreCode = getUserStorePreference();
                    setCustomerDefaultStore(currentStoreCode);
                } else {
                    console.error('Error when getting the customer preferred store');
                }
            }
        }

        // added condition to run the script again as when removing a product the script does not run
        // and thus the store id again becomes visible
        if (location.pathname.includes('cart')) initialiseBopis();
    }).observe(document, {subtree: true, childList: true});

})();