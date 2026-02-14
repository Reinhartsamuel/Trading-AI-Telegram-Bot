import { sendNotification  } from "./bot";
function main() {
 sendNotification(7389805128, 
    "Pembayaran kamu untuk Pro Plan Rp 99,000 berhasil. ID: 1m1n23kjn123. \nKlik /start untuk memulai")
    .catch((e) => console.log(e, 'error test message'))
}


main()


const body = {
    "submission_id" : "123xxx",
    "payment_status" : "unpaid"
}

const headers = {
      "Content-Type": "application/json",
}