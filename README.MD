# Disclaimer
This repository contains some scripts we used to deploy our contracts to mainnet. Since then some things have changed: 
`MasterVampire`'s ownership has been transferred to timelock, a lot of initially deployed pools have been removed and staff like that.
But for those who'd like to test different things with the contract, we provide this deploy sequence you can execute on your local mainnet fork
to be able to test things with the contract. 

To use the script you'll need to run start ganache with the following command:
`ganache-cli -p 7545 -h 0.0.0.0 -f "unfura_link" -i 1337 -db aaa` , get one of the addresses from the output and insert it to the admin variable 
in `network-constants.js`. If you would like to test with a different address you'll need to provide a private key for that in the `admin.key` file.

Also, before running the script you will need to have a folder with compiled contracts next to this one. You can get it by running `build.bat` if you are on Windows or `build.sh` if you are on Linux. You'll need to have `contracts` folder next to this one for scripts to work.

And of course `npm install` before running anything.