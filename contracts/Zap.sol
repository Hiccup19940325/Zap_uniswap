// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";

contract Zap {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public immutable router;
    IUniswapV2Factory public immutable factory;
    IERC20 public immutable weth;

    constructor(address _router, address _weth, address _factory) {
        router = IUniswapV2Router02(_router);
        weth = IERC20(_weth);
        factory = IUniswapV2Factory(_factory);
    }

    function zapInToken(address _pair, address token, uint amount) external {
        address pair = factory.getPair(token, address(weth));

        require(pair == _pair, "Invalid pair or token");
        require(amount > 0, "amount should be more than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint toHalf = amount / 2;

        IERC20(token).approve(address(router), toHalf);

        address[] memory path;
        path = new address[](2);
        path[0] = token;
        path[1] = address(weth);

        uint[] memory amounts = router.swapExactTokensForTokens(
            toHalf,
            1,
            path,
            address(this),
            block.timestamp + 600
        );

        IERC20(token).approve(address(router), toHalf);
        weth.approve(address(router), amounts[1]);

        (uint amountToken, uint amountWeth, ) = router.addLiquidity(
            token,
            address(weth),
            toHalf,
            amounts[1],
            1,
            1,
            msg.sender,
            block.timestamp + 600
        );

        if (toHalf > amountToken) {
            IERC20(token).safeTransfer(msg.sender, toHalf - amountToken);
        }
        if (amounts[1] > amountWeth) {
            weth.safeTransfer(msg.sender, amounts[1] - amountWeth);
        }
    }

    function zapInEth(address pair) external payable {
        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();

        require(
            token0 == address(weth) || token1 == address(weth),
            "Invalid pair address"
        );
        require(msg.value > 0, "ether should be more than 0");

        uint toHalf = msg.value / 2;
        address[] memory path;
        path = new address[](2);
        path[0] = address(weth);
        path[1] = (address(weth) == token0) ? token1 : token0;

        uint[] memory amounts = router.swapExactETHForTokens{value: toHalf}(
            1,
            path,
            address(this),
            block.timestamp + 600
        );

        IERC20(path[1]).approve(address(router), amounts[1]);

        (uint amountToken, uint amountEth, ) = router.addLiquidityETH{
            value: toHalf
        }(path[1], amounts[1], 1, 1, msg.sender, block.timestamp + 600);

        if (amounts[1] > amountToken) {
            IERC20(path[1]).safeTransfer(msg.sender, amounts[1] - amountToken);
        }

        if (toHalf > amountEth) {
            payable(msg.sender).transfer(toHalf - amountEth);
        }
    }

    receive() external payable {}
}