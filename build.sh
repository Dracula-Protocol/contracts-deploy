base=$(pwd)

./solc --optimize --optimize-runs 999 --no-color -o ./compiled --bin --abi --base-path $base --allow-paths $base @=node_modules/@ \
 --libraries "contracts/VampireAdapter.sol:VampireAdapter:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" \
 ./contracts/interfaces/IUniswapV2Factory.sol \
 ./contracts/interfaces/IUniswapV2Pair.sol \
 ./contracts/interfaces/IUniswapV2Router02.sol \
 ./contracts/interfaces/IWETH.sol \
 ./contracts/IVampireAdapter.sol \
 ./contracts/DrainController.sol \
 ./contracts/MasterVampire.sol \
 ./contracts/DrainController.sol \
 ./contracts/VampireAdapter.sol \
 ./contracts/adapters/lua/LuaAdapter.sol \
 ./contracts/adapters/pickle/PickleAdapter.sol \
 ./contracts/adapters/uni/UniswapAdapter.sol \
 ./contracts/adapters/sushi/SushiAdapter.sol \
 ./contracts/adapters/yfv/YfvAdapter.sol \
 ./contracts/adapters/dodo/DODOAdapter.sol \
