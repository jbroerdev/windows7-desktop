export function mailPreset(email,provider='auto'){
 const domain=typeof email==='string'?email.trim().toLowerCase().split('@')[1]:'';
 if(provider==='gmail'||provider==='auto'&&['gmail.com','googlemail.com'].includes(domain))return{provider:'gmail',imap:{host:'imap.gmail.com',port:993,security:'tls'},smtp:{host:'smtp.gmail.com',port:587,security:'starttls'}};
 return null;
}
