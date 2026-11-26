export function normalizePhone(raw,country=''){
 if(!/^[+0-9\s().-]+$/.test(raw))throw Error('Укажите телефон с кодом страны, например +7 747 780 61 82.');
 let digits=raw.replace(/\D/g,'');if(digits.length===11&&digits.startsWith('8'))digits='7'+digits.slice(1);
 if(!/^[1-9][0-9]{7,14}$/.test(digits)||(['KZ','RU'].includes(country)&&(digits.length!==11||!digits.startsWith('7'))))throw Error('Проверьте телефон и код страны. Для Казахстана и России нужен номер +7 из 11 цифр.');
 return '+'+digits;
}
