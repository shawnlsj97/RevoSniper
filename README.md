# RevoSniper

RevoSniper is a bot that helps users to secure their Revolution spin class spots with their favourite bikes. With RevoSniper, users can focus more on spinning, and less on booking!

## Using RevoSniper

1. Download / clone the repository
2. Navigate to the cloned repository and edit the text file with your email and password. This is for RevoSniper to login to the Revolution application, no data is stored by the bot and all your credentials are stored solely on your computer.
3. Open a terminal and navigate to the cloned repository
4. Run RevoSniper using one of the following commands, replacing the fields including the <> brackets with the actual details of the class you desire. You may specify as many bikes as you want, each separated by a space
```
node index.js -d <date in DDMMYY format e.g. 071221> -t <time in 24-hr format e.g. 2030> -l <location: cecil / orchard / tanjong> -b <bike numbers with higher priority first, separate each bike number with a space>

npm start -- -d <date in DDMMYY format e.g. 071221> -t <time in 24-hr format e.g. 2030> -l <location: cecil / orchard / tanjong> -b <bike numbers with higher priority first, separate each bike number with a space>
```
Example: 
```
npm start -- -d 101221 -t 0800 -l cecil -b 19 18 17
node index.js -d 101221 -t 0800 -l cecil -b 19 18 17
```
5. If the class is available for booking, RevoSniper will proceed and make the booking immediately and display a success message. If the class is not available for booking yet, RevoSniper will schedule the booking for exactly a week in advance at 10:30 am when the bookings will be available.
6. Feel free to connect with me on Twitter (@shawnlsj) or Instagram (@shawn.lsj) to let me know of any bugs / suggestions for improvement!

## Authors

Shawn Lee - [@shawnlsj97](https://github.com/shawnlsj97) on GitHub
