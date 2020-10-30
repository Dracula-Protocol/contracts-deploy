let fs = require("fs");
let Web3 = require("web3");
const {addDays, transactionCallback}  = require('./helpers')
const {
  picklePIDs,
  sushiPIDs,
  uniPIDs,
  luaPIDs,
  yfvPIDs } = require('./deployVictimsPIDs');
const {MAINNET_FORK, WETH, UNISWAP_V2_ROUTER, UNISWAP_V2_FACTORY, ADMIN, DRAIN_ADDRESS, REWARD_UPDATER, DEVELOPER} = require('./network-constants');
let wethAbi = fs.readFileSync('../compiled/IWETH.abi').toString();
let adminKey = fs.readFileSync('./admin.key').toString();

const httpProvider = new Web3.providers.HttpProvider(MAINNET_FORK);
let web3 = new Web3(httpProvider);

const account = web3.eth.accounts.privateKeyToAccount(adminKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const GAS_LIMIT = 4700000;
const GAS_PRICE = web3.utils.toWei('85', 'gwei');
// accounts 

let drcTokenContract;
let wethTokenContract;
let masterVampireContract;

let pickleAdapterContract;
let sushiAdapterContract;
let uniswapAdapterConract;
let luaswapAdapterContract;
let yfvAdapterContract;

let poolsInitiationCount = 0;

deploymentSequence();

async function deploymentSequence() {
    console.log(MAINNET_FORK, WETH, UNISWAP_V2_ROUTER, UNISWAP_V2_FACTORY, ADMIN, DRAIN_ADDRESS, REWARD_UPDATER, DEVELOPER);
    const drcAddress = await deployDraculaTokenAndMint();
    const drcEthPairAddress = await setupPairInUniswap(drcAddress);
    await addLiquidityToPair(drcAddress, drcEthPairAddress)
    const vampireAdapterLibAddress = await deployVampireAdapterAndGetAddress();
    await deployMasterVampire(drcAddress, vampireAdapterLibAddress);
    await deployAdapters();
    await poolsInitiation();

    console.log('masterVampire address: ', masterVampireContract.options.address)
    console.log('drcToken address: ', drcTokenContract.options.address)
    const result = {
      masterVampire: masterVampireContract.options.address,
      dracula: drcTokenContract.options.address,
      Pickle: pickleAdapterContract.options.address,
      Sushi: sushiAdapterContract.options.address,
      Uni: uniswapAdapterConract.options.address,
      Lua: luaswapAdapterContract.options.address,
      Yfv: yfvAdapterContract.options.address,
    };

    fs.writeFileSync("deploy-result.json", JSON.stringify(result))
    process.exit()
}

async function deployDraculaTokenAndMint() {
    const draculaTokenContract = await deployContract('../compiled/DraculaToken.bin', '../compiled/DraculaToken.abi', [])

    const methodCall = draculaTokenContract.methods.mint(ADMIN, web3.utils.toWei('35', 'ether'));
    const estimatedGas = await estimateGas(methodCall, ADMIN)
    await methodCall.send({
        from: ADMIN,
        gas: estimatedGas,
        gasPrice: GAS_PRICE
    },transactionCallback)
    .on('confirmation', () => { })
    .catch(err => {
        throw (err)
    })

    console.log('Minting completred');

    await approveForRouter(draculaTokenContract);
    console.log('dracula address: ', draculaTokenContract.options.address)
    drcTokenContract = draculaTokenContract;
    return draculaTokenContract.options.address;
}

async function approveForRouter(drcContract) {
    try {
        wethTokenContract = new web3.eth.Contract(JSON.parse(wethAbi));
        wethTokenContract.setProvider(httpProvider);
        wethTokenContract.options.address = WETH;

        
        let method = wethTokenContract.methods.deposit();
        let estimatedGas = await estimateGas(method, ADMIN, web3.utils.toWei('100', 'milli'));
        await method.send({
                'value': web3.utils.toWei('100', 'milli'),
                'from': ADMIN,
                gas: estimatedGas,
                gasPrice: GAS_PRICE
            }, transactionCallback)
            .on('confirmation', () => { })
            .catch(err => {
                throw (err)
            })
        console.log('deposit weth')

        method = wethTokenContract.methods.approve(UNISWAP_V2_ROUTER, web3.utils.toWei('100', 'milli'));
        estimatedGas = await estimateGas(method, ADMIN);
        await method.send({
            from: ADMIN,
            gas: estimatedGas,
            gasPrice: GAS_PRICE
        }, transactionCallback)
        .on('confirmation', () => { })
        .catch(err => {
            throw (err)
        })

        method = drcContract.methods.approve(UNISWAP_V2_ROUTER, web3.utils.toWei('35', 'ether'));
        estimatedGas = await estimateGas(method, ADMIN);
        await method.send({
            from: ADMIN,
            gas: estimatedGas,
            gasPrice: GAS_PRICE
        }, transactionCallback)
        .on('confirmation', () => { })
        .catch(err => {
            throw (err)
        })

    } catch (e) {
        throw (e)
    }
}

async function setupPairInUniswap(drcAddress) {
    let univ2FacotyAbi = fs.readFileSync('../compiled/IUniswapV2Factory.abi')
    let univ2Factory = new web3.eth.Contract(JSON.parse(univ2FacotyAbi));
    univ2Factory.setProvider(httpProvider);
    univ2Factory.options.address = UNISWAP_V2_FACTORY;

    let method = univ2Factory.methods.createPair(WETH, drcAddress);
    let estimatedGas = await estimateGas(method, ADMIN);
    return await method.send({
        from: ADMIN,
        gas: estimatedGas,
        gasPrice: GAS_PRICE
    },
    transactionCallback)
    .on('confirmation', () => { })
    .then((pairAddress) => {
        console.log('lp pair address', pairAddress.events.PairCreated.address)
        return pairAddress.events.PairCreated.address;
    })
    .catch(err => {
        throw (err)
    })
}

async function addLiquidityToPair(drcAddress, pairAddress) {
    let univ2routerv2Abi = fs.readFileSync('../compiled/IUniswapV2Router02.abi')
    let univ2Router2 = new web3.eth.Contract(JSON.parse(univ2routerv2Abi));
    univ2Router2.setProvider(httpProvider);
    univ2Router2.options.address = UNISWAP_V2_ROUTER;

    const method =  univ2Router2.methods.addLiquidity(
        WETH,
        drcAddress,
        web3.utils.toWei('100', 'milli'),
        web3.utils.toWei('35', 'ether'),
        web3.utils.toWei('90', 'milli'),
        web3.utils.toWei('34', 'ether'),
        ADMIN,
        addDays(10).getTime()
    );
    const estimatedGas = await estimateGas(method, ADMIN);
    return await method.send({
        from: ADMIN,
        gas: estimatedGas,
        gasPrice: GAS_PRICE
    },transactionCallback)
    .on('confirmation', () => { })
    .then((transactionData) => {
        console.log('liquidity to lp pair added');
        return transactionData;
    })
    .catch(err => {
        throw (err)
    })
}

async function deployVampireAdapterAndGetAddress() {
    const vampireAdapterLib = await deployContract('../compiled/VampireAdapter.bin', '../compiled/VampireAdapter.abi', [])
    return vampireAdapterLib.options.address;
}


async function deployMasterVampire(drcAddress, vampireAdapterLibAddress) {
    const linkToLib = '__$9f5623cf05289beb26a610ce2d0c050049$__';
    let masterVampireAbi = fs.readFileSync('../compiled/MasterVampire.abi').toString();
    let masterVampireBin = fs.readFileSync('../compiled/MasterVampire.bin').toString();
    let normLibStr = vampireAdapterLibAddress.slice(2).toLowerCase();
    masterVampireBin = masterVampireBin.split(linkToLib).join(normLibStr);
    console.log('masterVampireBin', masterVampireBin)
    const masterVampire = new web3.eth.Contract(JSON.parse(masterVampireAbi));
    let method = masterVampire.deploy({ data: "0x" + masterVampireBin, arguments: [drcAddress, DRAIN_ADDRESS] });
    let estimatedGas = await estimateGas(method, ADMIN);
    return await method.send({
            from: ADMIN,
            gas: estimatedGas,
            gasPrice: GAS_PRICE
        },
            (err, transactionHash) => {
                if (err) throw (err)
            })
        .on('confirmation', () => { })
        .then(async (newMasterVampireInstance) => {
            console.log('Contract Deployed:  ../compiled/MasterVampire.abi', newMasterVampireInstance.options.address)

            const contractAddress = newMasterVampireInstance.options.address;

            let method = drcTokenContract.methods.transferOwnership(contractAddress);
            let estimatedGas = await estimateGas(method, ADMIN);
            await method.send({
                from: ADMIN,
                gas: estimatedGas,
                gasPrice: GAS_PRICE
            }, transactionCallback)
            .on('confirmation', () => { })
            .catch(err => {
                throw (err)
            })

            console.log('transfer ownership')
            method = newMasterVampireInstance.methods.updateRewardUpdaterAddress(REWARD_UPDATER);
            estimatedGas = await estimateGas(method, ADMIN);
            await method.send({
                from: ADMIN,
                gas: estimatedGas,
                gasPrice: GAS_PRICE
            }, transactionCallback)
            .on('confirmation', () => { })
            .catch(err => {
                throw (err)
            })

            console.log('update reward updater address')
            method = newMasterVampireInstance.methods.updateDevAddress(DEVELOPER);
            estimatedGas = await estimateGas(method, ADMIN);
            await method.send({
                from: ADMIN,
                gas: estimatedGas,
                gasPrice: GAS_PRICE
            },transactionCallback)
            .on('confirmation', () => { })
            .catch(err => {
                throw (err)
            })

            console.log('update dev address')
            masterVampireContract = newMasterVampireInstance;
            console.log(contractAddress)
            return contractAddress;
        })
        .catch(e => {
          if (e) throw e;
        })
}

async function deployContract(binPath, abiPath, constructorArgiments) {
    let abi = fs.readFileSync(abiPath).toString();
    let bin = fs.readFileSync(binPath).toString();
    const contractToDeploy = new web3.eth.Contract(JSON.parse(abi));
    let method = contractToDeploy.deploy({ data: "0x" + bin, arguments: constructorArgiments });
    let estimatedGas = await estimateGas(method, ADMIN);
    return await method.send({
            from: ADMIN,
            gas: estimatedGas,
            gasPrice: GAS_PRICE
        },transactionCallback)
        .on('confirmation', () => { })
        .then((newContractInstance) => {
            console.log('Contract Deployed: ', abiPath, newContractInstance.options.address);
        return newContractInstance;
        })
        .catch(err => {
            throw (err)
        })
}

async function deployAdapters() {
    pickleAdapterContract =  await deployContract('../compiled/PickleAdapter.bin', '../compiled/PickleAdapter.abi', [])
    sushiAdapterContract =   await deployContract('../compiled/SushiAdapter.bin', '../compiled/SushiAdapter.abi', [])
    uniswapAdapterConract =  await deployContract('../compiled/UniswapAdapter.bin', '../compiled/UniswapAdapter.abi', [])
    luaswapAdapterContract = await deployContract('../compiled/LuaAdapter.bin', '../compiled/LuaAdapter.abi', [])
    yfvAdapterContract =     await deployContract('../compiled/YfvAdapter.bin', '../compiled/YfvAdapter.abi', [])
}

async function addPool(victim, victimPID, rewardPerBlock, rewardDrainMod, wethDrainMod) {
    let method = masterVampireContract.methods.add(victim, victimPID, rewardPerBlock, rewardDrainMod, wethDrainMod);
    let estimatedGas = await estimateGas(method, ADMIN);
    await method.send({
        from: ADMIN,
        gas: estimatedGas,
        gasPrice: GAS_PRICE
    }, transactionCallback)
    .on('confirmation', () => { })
    .then(newPool => {
        console.log(victim, victimPID, 'added')
    })
    .catch(e => {
      throw(e)
    })
}

async function initiateVictimsPools(pools, victimAddress, victimName) {
    const initiatedPools = []
    for (let pool of pools) {
        await addPool(victimAddress, pool.pid, web3.utils.toWei('0', 'ether'), 0, 0)
        poolsInitiationCount++;
        initiatedPools.push({pid: poolsInitiationCount, token: pool.token})
    }
    console.log('')
    console.log(victimName)
    console.log(initiatedPools)
    console.log('')
}

async function poolsInitiation() {
    // drc
    await addPool('0x0000000000000000000000000000000000000000', 0, web3.utils.toWei('0', 'ether'), 0, 0);
    console.log('DRC    pool:  0 DRC-ETH')
    console.log('pool number: ', poolsInitiationCount)

    await initiateVictimsPools(picklePIDs, pickleAdapterContract.options.address, 'Pickle')
    await initiateVictimsPools(sushiPIDs, sushiAdapterContract.options.address, 'Sushi ')
    await initiateVictimsPools(uniPIDs, uniswapAdapterConract.options.address, 'Uniswap')
    await initiateVictimsPools(luaPIDs, luaswapAdapterContract.options.address, 'Luaswap')
    await initiateVictimsPools(yfvPIDs, yfvAdapterContract.options.address, 'YFV   ')
}

async function estimateGas(methodCall, from, transactionValue) {
  const options = {
    gas: GAS_LIMIT,
    from
  };
  if (transactionValue) {
    options.value = transactionValue;
  }

  return await methodCall.estimateGas(options).then(gasAmount => {
    gasAmount = parseInt(gasAmount * 1.1);
    
    console.log('gas to spend: ', gasAmount)
    if (gasAmount === GAS_LIMIT) {
      throw(new Error('run out of gas', methodCall))
    }
    return gasAmount;
  });
}