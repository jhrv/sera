FROM centos:7
MAINTAINER Johnny Horvi <johnny.horvi@nav.no>

COPY nodejs /tmp/nodejs
RUN yum install -y /tmp/nodejs/*.rpm

COPY dist /opt/sera

EXPOSE 6969
CMD ["node", "/opt/sera/server.js"]