<template>
  <div class="hc-bopis-modal">
    <div class="hc-modal-content">
      <div class="hc-modal-header">
        <span class="hc-close" @click="closeBopisModal"></span>
        <h1 class="hc-modal-title">Pick up today</h1>
      </div>
      <form id="hc-bopis-form">
        <input name="pin" v-model="queryString" placeholder="Enter zipcode"/>
        <button type="submit" class="btn hc-bopis-pick-up-button" @click.prevent="getStoreInformation">Find Stores</button>
      </form>
      <div class="hc-store-information">
        <div id="hc-store-card" v-for="store in storesWithInventory" :key="store.storeCode">
          <div id="hc-store-details">
            <div id="hc-details-column">
              <h4 class="hc-store-title" v-if="store.storeName">{{ store.storeName }}</h4>
              <p v-if="store.address1">{{ store.address1 }}</p>
              <p>{{ store.city ? store.city : '' }} {{ store.stateCode ? store.stateCode : '' }} {{ store.postalCode ? store.postalCode : '' }} {{ store.countryCode ? store.countryCode : '' }}</p>
            </div>
            <div id="hc-details-column">
              <p>In stock</p>
              <p v-if="store.storePhone">{{ store.storePhone }}</p>
              <p>{{ store.regularHours ? 'Open Today: ' + tConvert(openData(store.regularHours).openTime) + ' - ': '' }} {{ store.regularHours ? tConvert(openData(store.regularHours).closeTime) : '' }}</p>
            </div>
          </div>
          <button class="btn btn--secondary-accent hc-store-pick-up-button" @click="updateCart(store)">Pick Up Here</button>
          <hr/>
        </div>
      </div>
      <p class="hc-store-not-found" v-if="storesWithInventory.length <= 0">{{ 'No stores found for this product' }}</p>
    </div>
  </div>
</template>

<script>
import { axios } from '@/api';
import emitter from '@/event-bus';
import { defineComponent, onMounted, onUnmounted, reactive, ref } from 'vue';
import serialize from "form-serialize"
import { bopisButtonInstance, isProductAvailable, isProductProrderedOrBackordered, tConvert, openData } from '@/bopisPDP';

export default defineComponent({
  name: 'StoreLocator',
  setup() {
    const queryString = ref('');
    const baseUrl = ref('https://dev-apps.hotwax.io');
    const stores = ref([]);
    const storesWithInventory = ref([]);
    const productSku = ref()
    const bopisCustomConfig = reactive({
      'enableCartRedirection': true
    });
    const observer = ref()
    const url = ref(window.location.href)
    const geoLocation  = reactive({});

    async function checkInventory(payload) {
      // this will create a url param like &facilityId=store_1&facilityId=store_1 which is then sent
      // with the url, used this approach as unable to send array in the url params and also unable to
      // pass body as the request type is GET.
      let paramFacilityId = '';
      payload.facilityId.map((facility) => {
        paramFacilityId += `&facilityId=${facility}`
      })

      let resp;

      // added try catch to handle network related errors
      try {
        resp = await new Promise(function(resolve, reject) {
          axios.get(`${baseUrl.value}/api/checkInventory?sku=${payload.sku}${paramFacilityId}`)
          .then((response) => resolve(response))
          .catch((err) => reject(err));
        })
      } catch (err) {
        resp = err;
      }
      return resp;
    }

    function getStoreInformation () {
      storesWithInventory.value = [];
      productSku.value = document.querySelector("input.hc_product_sku").textContent.length > 0 ? document.querySelector("input.hc_product_sku").textContent : document.querySelector("input.hc_product_sku").value;

      const payload = {
        viewSize: 100
      }

      if(queryString.value) {
        payload['keyword'] = queryString.value
      }

      if (geoLocation && geoLocation.latitude && geoLocation.longitude) {
        payload["distance"] = 50
        payload["point"] = `${geoLocation.latitude}, ${geoLocation.longitude}`
      }

      // applied a condition that if we have location permission then searching the stores for the current location
      // if we have both location and pin, then using the pin to search for stores
      // if we doesn't have location permission and pin, then will fetch all the available stores
      return new Promise(function(resolve, reject) {
        axios.post(`${baseUrl.value}/api/storeLookup`, payload)
          .then(async (response) => {
            stores.value = response.data.response.numFound > 0 ? response.data.response.docs : [];

            if (stores.value.length > 0) {
              const storeCodes = stores.value.map((store) => {
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
              const payload = {"sku" : productSku.value, "facilityId": storeCodes};
              const result = await checkInventory(payload) ?? [];

              if (result.data.count > 0 && result.data.docs) {
                storesWithInventory.value = stores.value.filter((location) => {
                  return result.data.docs.some((doc) => {
                    return doc.facilityId === location.storeCode && doc.atp > 0;
                  })
                })
              }
            }
          })
          .catch((error) => console.error(error));
      })
    }

    async function updateCart(store) {

      const addToCartForm = document.getElementsByClassName('hc-product-form')[0];

      // let merchant define the behavior whenever pick up button is clicked, merchant can define an event listener for this event
      // jQueryBopis(document).trigger('prePickUp');

      // made the property hidden by adding underscore before the property name
      const facilityIdInput = document.createElement('input')
      facilityIdInput.id = 'hc-store-code'
      facilityIdInput.name = 'properties[_pickupstore]'
      facilityIdInput.value = store.storeCode ? store.storeCode : ''
      facilityIdInput.type = 'hidden'
      addToCartForm.append(facilityIdInput)

      const facilityNameInput = document.createElement('input')
      facilityNameInput.id = 'hc-pickupstore-address'
      facilityNameInput.name = 'properties[Pickup Store]'
      facilityNameInput.value = store.storeName ? store.storeName : '' + store.address1 ? store.address1 : '' + store.city ? store.city : ''
      facilityNameInput.type = 'hidden'
      addToCartForm.append(facilityNameInput)

      const resp = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serialize(addToCartForm, { hash: true }))
      })
      .then(response => {
        return response.json();
      })
      .catch((error) => {
        console.error('Error:', error);
        return error
      });

      if(resp.id && bopisCustomConfig.enableCartRedirection) {
        window.location.replace('/cart');
      }

      facilityIdInput.remove();
      facilityNameInput.remove();
    }

    function closeBopisModal(event) {
      emitter.emit('closeBopisModal', event);
    }

    // function to get co-ordinates of the user after successfully getting the location
    function locationSuccess (pos) {
      geoLocation.latitude = pos.coords.latitude;
      geoLocation.longitude = pos.coords.longitude;
    }

    // function to display error on console if having any error when getting the location
    function locationError (err) {
      console.error(err.code, err.message);
    }

    // will fetch the current location of the user
    function getCurrentLocation () {
      return navigator.geolocation.getCurrentPosition(locationSuccess, locationError);
    }

    onMounted(async () => {
      await getCurrentLocation();
      getStoreInformation();

      // TODO: handle case of preorder/backorder check when changing variant
      observer.value = new MutationObserver(async () => {
        if (window.location.href !== url.value) {
          url.value = window.location.href;
          queryString.value = '';
          geoLocation.latitude = ''
          geoLocation.longitude = ''
          await getCurrentLocation();
          getStoreInformation();
          bopisButtonInstance.isProductAvailableForBopis = isProductAvailable(bopisButtonInstance.currentProduct, productSku.value)
          bopisButtonInstance.isProductAvailableForBopis = !isProductProrderedOrBackordered(bopisButtonInstance.currentProduct, productSku.value)
        }

        if (window.location.pathname.includes('cart')) {
          document.querySelectorAll("[data-cart-item-property-name]:contains('pickupstore')").closest('li').hide();
        }
      }).observe(document, {subtree: true, childList: true});
    })

    onUnmounted(() => {
      observer.value.destroy();
    })

    return {
      closeBopisModal,
      getStoreInformation,
      queryString,
      stores,
      storesWithInventory,
      updateCart,
      tConvert,
      openData
    }
  }
});
</script>

<style scoped>
hr {
  margin: 24px 0;
}

p {
  margin: 0;
}

.hc-bopis-modal {
  position: fixed;
  z-index: 2001;
  left: 0;
  top: 0;
  width: 100%;
}

.hc-modal-title {
  text-align: center;
  justify-content: center;
  font-size: 2rem;
}

.hc-modal-content {
  background-color: #fefefe;
  margin: 15% auto;
  padding: 20px;
  width: 80%;
  height: 400px;
  overflow: auto;
}

.hc-close {
  float: right;
  cursor: pointer;
}

.hc-close::after {
  content: 'x';
}

.hc-store-pick-up-button {
  margin-top: 1rem;
  width: 100%;
}

.hc-bopis-pick-up-button {
  padding: 10px 5px;
}

.hc-store-title {
  margin: 0;
}

.hc-store-not-found {
  margin: 5px;
}


.hc-store-information {
  padding-top: 20px;
}

#hc-store-details {
  display: flex;
  padding: 5px;
}

#hc-details-column {
  flex: 0 0 50%;
}

@media (min-width: 997px) {
  .hc-modal-content {
    width: 50%;
    max-width: 600px;
  }
}

@media (max-width: 768px) {
  .hc-bopis-modal {
    overflow: auto;
    height: 100%;
  }

  .hc-modal-content {
    height: 100%;
    width: 100%;
    margin: 0;
  }

  #hc-bopis-form {
    display: grid;
    grid-template-columns: none;
    max-height: fit-content;
  }

  #hc-bopis-store-pin {
    width: 100%;
    margin-bottom: 10px;
  }

  #hc-store-details {
    display: block;
    padding: 5px;
  }

  #hc-details-column {
    flex: 0;
  }
}
</style>