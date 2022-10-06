<template>
  <div class="hc-bopis-modal">
    <div class="hc-modal-content">
      <div class="hc-modal-header">
        <span class="hc-close" @click="closeBopisModal"></span>
        <h1 class="hc-modal-title">Pick up today</h1>
      </div>
      <form>
        <input name="pin" v-model="queryString" placeholder="Enter zipcode"/>
        <button type="submit" class="btn hc-bopis-pick-up-button" @click="getStoreInformation">Find Stores</button>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { axios } from '@/api';
import emitter from '@/event-bus';
import { defineComponent, onMounted, ref } from 'vue';

export default defineComponent({
  name: 'StoreLocator',
  setup() {
    const queryString = ref('');
    const baseUrl = ref('https://dev-apps.hotwax.io');

    function getStoreInformation () {
      const payload = {
        viewSize: 100
      } as any

      if(queryString.value) {
        payload['keyword'] = queryString.value
      }

      // if ($location) {
      //   payload["distance"] = 50
      //   payload["point"] = `${$location.latitude}, ${$location.longitude}`
      // }

      // applied a condition that if we have location permission then searching the stores for the current location
      // if we have both location and pin, then using the pin to search for stores
      // if we doesn't have location permission and pin, then will fetch all the available stores
      return new Promise(function(resolve, reject) {
        axios.post(`${baseUrl.value}/api/storeLookup`, payload)
          .then((response) => response)
          .catch((error) => console.error(error));
      })
    }

    function closeBopisModal(event: CustomEvent) {
      emitter.emit('closeBopisModal', event);
    }

    onMounted(() => {
      getStoreInformation();
    })

    return {
      closeBopisModal,
      queryString
    }
  }
});
</script>